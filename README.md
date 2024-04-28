# File gallery server

Before you start using the app you have to create the .env file in the root folder and fill based on the .env.example's content.

## Available Scipts

In the project directorym you can run:

`npm start`

Runs the express app on the defined port or 5000 (PORT).

`npm run dev`

Runs the express app as before but the server will reload if you make edits.

## Docker

Build image:

`docker build -t gallery-server .`

Run image:

`docker run -p 5000:5000 gallery-server`
