# my-concert-radar 
This project uses the Spotify API and Ticketmaster API to generate a list of upcoming concerts that users may be interested in attending. Since this project is made in spotify's development mode, so in order for other users to use this app, they must create a Spotify Developer account and create their own app.

The app starts with a homepage where users log in to their spotify account with OAuth, and then after user authentication redirects to a user page. User selects their state and how many artists they would like to show (10, 20 or 30). Upon submission, a call is made to the Spotify API to get the users 10, 20 or 30 top artists and then calls are made to the Ticketmaster API to get the Attraction ID corresponding to each artist, and then searching for events for each artist in the specified location. User is then redirected to a concerts page that shows the users top artists and any upcoming concerts.   

The project uses Node.js and Express.js on the backend with Axios HTTP-client to handle the API requests. The frontend is comprised of EJS files with some CSS styling.

## Getting Started

### Prerequisites
node.js and npm installed
Spotify Developer account (more on this later)
Ticketmaster Developer account (more on this later)

### Installation and Setup

1. clone the repository: git clone https://github.com/aaronsant/my-concert-radar
2. navigate to project directory: cd EXAMPLE_PATH_TO_PROJECT_FOLDER
3. setup NPM: npm init
4. install dependencies: npm i
6. Create environment variables. In project root directory, create a file named '.env' 
7. Configure Spotify Developer Web App:
   a) Create Spotify Developer account if not done already (https://developer.spotify.com/)
   b) Navigate to dashboard and press Create App. 
   c) Give the app any name and description.
   d) For Redirect URIs enter http://localhost:3000/ (THIS IS ESSENTIAL)
   e) For APIs used enter Web API
8. Once the app is created, navigate to the app from Dashboard, click Settings and find the Client ID and Client Secret.
9. In the project directory, go to the .env file and write the following lines using the Client ID and Client Secret from previous step in the respective fields. The Client ID and Client Secret from the web app should be entered immediately after the = sign. TM_API_KEY will be filed later
   CLIENT_ID=
   CLIENT_SECRET=
   TM_API_KEY=
10. Configure Ticketmaster Developer account:
    a) Create Ticketmaster Developer account if not done already (https://developer-acct.ticketmaster.com/user/login)
    b) Press add a new app
    c) Enter any name for the application name
    d) for Redirect URI 1 enter https://oauth.ticketmaster.com/oauth/login
    e) create the application
11. Once created, navigate to app on the dashboard and find the consumer key under the Keys section. Enter the consumer key in the .env file for the TM_API_KEY field (Should come immediately after = sign).

### Running the Application
run the app using the command: nodemon index.js

## Project Stucture
public/ : contains static files.

    /images/ : contains any images used in the project. 
    
    /styles/ : contains css files used.
    
views/ : contains HTML/EJS files.

    /partials/ : contains header and footer partial EJS files.
    
.env : contains environment variables as explained in Installation and Set Up section above.

index.js : main JS file and entry point into the application. Contains all routes and backend JavaScript code.

package.json : project Metadata and dependencies.

READNE.md : Project Documentation.
    
    
