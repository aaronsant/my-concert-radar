import dotenv from 'dotenv';
dotenv.config();
import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import queryString from "node:querystring";
import path, { dirname } from "path";
import { fileURLToPath } from "url"; // THESE NEXT 2 LINES LET US GRAB DIRECTORY NAME DYNAMICALLY
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 3000;

//API Information
const client_id = process.env.CLIENT_ID; //Spotify Client ID from .env folder
const client_secret = process.env.CLIENT_SECRET; //Spotify Client Secret from .env folder
const auth_code_base64 = Buffer.from(`${client_id}:${client_secret}`, 'utf-8').toString('base64');
const redirect_uri = "http://localhost:3000/user"; //Spotify Redirect URI (route spotify redirects to after authentication)
const redirect_uri_encoded = encodeURIComponent(redirect_uri)
const apiKeyTM = process.env.TM_API_KEY; //Ticketmaster API key from .env folder

// Spotify URL to authorize user
const AUTH_USER_URL = `https://accounts.spotify.com/authorize?client_id=${client_id}&response_type=code&redirect_uri=${redirect_uri_encoded}&scope=user-top-read`

// Initialize user variables
var artistIDs = [];
var allEvents = [];
var topArtists = [];
var userCode;
var numArtists;
var myState;
var eventsInOrder;

// ---------------------------- Middleware ---------------------------------
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));

// ----------------------------- Routes ------------------------------------
// Homepage route
app.get("/", async (req, res) => {
    res.render("index.ejs", { authorization_URL: AUTH_USER_URL})
})

// user route, page redirected to after user logs in with spotify
app.get("/user", async (req, res) => {
    userCode = req.query.code;
    //console.log(`Spotify response code: ${userCode}`);
    res.render("user.ejs", {states: statesArr});

})

//concerts route, after user logs in and make state and numArtist selections, gets the concert information
app.post("/concerts", async (req, res) => {
    numArtists = req.body['numArtists'];
    myState = req.body['state'];

    const accessToken = await getAuth(userCode);
    const TOP_ARTISTS_URL = `https://api.spotify.com/v1/me/top/artists?limit=${numArtists}`;
    try {
        const config = {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        };
        //use spotify API to grab top artists
        const response = await axios.get(TOP_ARTISTS_URL, config);
        topArtists = getTopArtists(response.data.items);
        //console.log(topArtists);

        //call getArtistIDs to convert artist names to Ticketmaster attractionIDs using Ticketmaster API
        artistIDs = await getArtistIDs(topArtists);
        //console.log(artistIDs);

        //call getEvents to use Ticketmaster API to find all events for the users top artists in the users state
        allEvents = await getEvents(artistIDs, myState);
        //console.log('all events');
        eventsInOrder = organizeEvents(allEvents);

        res.render("concerts.ejs", {
            topArtists: topArtists,
            events: eventsInOrder,
            monthNames: monthNames
        });

    } catch (error) {
        console.log(error);
    }   
})

// Run app on port 3000
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
})

// ------------------- HELPER FUNCTIONS ------------------------------------
// getAuth takes the usercode provided from the Spotify Authorization and generates the access token to use the Spotify API
async function getAuth(userCode){
    try {
        const data = queryString.stringify({
            grant_type:"authorization_code",
            code: userCode,
            redirect_uri: redirect_uri
        });

        const headers = {
            headers: {
                'Authorization': `Basic ${auth_code_base64}`,
                'Content-Type': 'application/x-www-form-urlencoded'  
            }
        };

        const response = await axios.post('https://accounts.spotify.com/api/token', data, headers);
        return response.data.access_token

    } catch (error) {
        console.log(error)
    }
}

// getArtistIDs takes an array of artist names and gets the Ticketmaster attraction IDs that correspond to each artist using the Ticketmaster API
async function getArtistIDs(artists){
    
    let ids = [];
    for (let artist of artists) {
        await delay(250);
        const api_url = `https://app.ticketmaster.com/discovery/v2/attractions.json?keyword=${encodeURIComponent(artist.name)}&apikey=${apiKeyTM}`;
        try {
            const response = await axios.get(api_url)
            const attractionsArray = response.data._embedded.attractions
            
            attractionsArray.forEach(attraction => {
                if (attraction.name === artist.name) {
                    ids.push(attraction.id);
                }
            })

        } catch (error) {
            console.log(error.code);
        }
    };
    
    return ids
}

// getEvents takes the artistIDs and state, and uses the Ticketmaster API to get a list of events for the artists in the area
async function getEvents(artistIDs, state) {
    let eventList = [];
    for (let artistID of artistIDs) {
        
        await delay(250); // Delay to not exceed ticketmaster rate limit 
        const api_url = `https://app.ticketmaster.com/discovery/v2/events.json?attractionId=${artistID}&stateCode=${state}&apikey=${apiKeyTM}`;
        try {
            const response = await axios.get(api_url);
            const eventsArray = response.data._embedded.events;

            //create Event object for each event returned from ticketmaster
            eventsArray.forEach(event => {
                var newEvent = new Event(
                    event.name,
                    event.url,
                    event.dates.start.localDate,
                    event._embedded.venues[0].name,
                    event._embedded.venues[0].city.name
                )
                eventList.push(newEvent);
            })

        } catch (error) {
            console.log(error.code);
        }
    }
    
    return eventList
}

// getTopArtists uses the Spotify API response data to create a list of artists 
function getTopArtists(spotifyData) {
    var topArtists = [];
    
    //create Artist object for each artist returned from spotify
    spotifyData.forEach((artist) => {
        var newArtist = new Artist(
            artist.name,
            artist.images[0].url,
            artist.external_urls.spotify
        )

        topArtists.push(newArtist);
    })
    return topArtists
}

// Delay function creates a delay that prevents calls from exceeding rate limits for API
async function delay(milliseconds) {
    return new Promise(resolve => {setTimeout(resolve, milliseconds);})
}

function organizeEvents(allEvents) {
    //sort Events by date
    allEvents.sort(function(e1, e2){ 
        return e1.date - e2.date;
    })

    //get information about todays date
    var today = new Date();
    var curMonth = today.getMonth();
    var curYear = today.getFullYear();

    var eventList = [];
    var eventsInCurMonth = [];
    var count = 0;

    while (allEvents.length >= 0 && count < 200) {
        //obtain closest upcoming event
        var event = allEvents[0];

        //if the event matches the current month and year, add it to the eventsInCurMonth array
        if (allEvents.length != 0 && event.date.getMonth() === curMonth && event.date.getFullYear() === curYear){
            eventsInCurMonth.push(allEvents.shift());

        } else { //if the event is not in current month and year or there are no events left
            //add the eventsInCurMonth array to the eventList array
            eventList.push(eventsInCurMonth);

            //if all events have been placed in appropriate month and pushed to eventList, break
            if (allEvents.length === 0) {
                break;
            }

            //reset events in current month, update to next month and update year if necessary
            eventsInCurMonth = []
            curMonth = curMonth + 1;

            if (curMonth === 12){
                curMonth = 0;
                curYear = curYear + 1
            }
        }
        //counter increase to break loop after 200 iterations
        count = count + 1
        
    }
    return eventList
}

//-------------------------------- OBJECTS ----------------------------
//Event Object
class Event {
    constructor(eventName, eventURL, date, venue, city){
        this.eventName = eventName;
        this.eventURL = eventURL;
        this.date = new Date(date);
        this.venue = venue;
        this.city = city;
    }
}

class Artist {
    constructor(name, imageURL, spotifyURL){
        this.name = name;
        this.imageURL = imageURL;
        this.spotifyURL = spotifyURL
    }
}


const statesArr = ['AL', 'AK', 'AS', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FM', 'FL', 'GA', 'GU', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MH', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'MP', 'OH', 'OK', 'OR', 'PW', 'PA', 'PR', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VI', 'VA', 'WA', 'WV', 'WI', 'WY',
                'AB', 'BC', 'MB', 'NB', 'NL', 'NT', 'NS', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
var monthNames = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
