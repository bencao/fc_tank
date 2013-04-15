#FC Tank

a rewrite of classic FC game "90 Tank" using coffee script
[![Build Status](https://travis-ci.org/bencao/fc_tank.png?branch=master)](https://travis-ci.org/bencao/fc_tank)

##Run the game
I assume you got git and python installed on your machine.
```bash
git clone https://github.com/bencao/fc_tank.git fc_tank
cd fc_tank
python -m SimpleHTTPServer
```
open your browser and visit "http://localhost:8000", you'll find it!

##Contribute

###Edit
main file is tank.coffee and game.coffee.

###Test
To run test, you need to install [npm](https://npmjs.org/)
```bash
npm install -g --dev
grunt test
```



