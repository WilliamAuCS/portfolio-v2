const express = require('express');
const router = express.Router();
const User = require('../models/user.js');
const validator = require('validator');


// Response from /api
router.get('/', (req, res) => {
    res.send("From API route");
});

// Post request to encrypt string
router.post('/encrypt/:encrypt_type', (req, res) => {
    let data = req.body;
    let encrypt_type = req.params.encrypt_type;

    if(encrypt_type == "Argon2i") {
        encryptToArgon(data.text, (hashed) => {
            // Return hashed value
            res.status(200).send({ result: hashed });
        })
    }
    else if(encrypt_type == "bcrypt") {
        encryptTobcrypt(data.text, (hashed) => {
            // Return hashed value
            res.status(200).send({ result: hashed });
        })
    }
    else if(encrypt_type == "scrypt") {
        encryptToscrypt(data.text, (hashed) => {
            // Return hashed value
            res.status(200).send({ result: hashed.toString('hex') });
        })
    }
    

});

const argon2 = require('argon2');
// Encrypting string using Argon2i
function encryptToArgon(toHash, callback) {
    // Hashing and using result in callback
    argon2.hash(toHash).then((hashed) => {
        callback(hashed);
    });
}

const bcrypt = require('bcrypt');
// Encrypting string using bcrypt
function encryptTobcrypt(toHash, callback) {
    // Default rounds of salt generation
    const saltRounds = 10;
    // Hashing and using result in callback
    bcrypt.hash(toHash, saltRounds, function(err, hashed) {
        callback(hashed);
    });
}

const crypto = require('crypto');
// Encrypting string using scrypt
function encryptToscrypt(toHash, callback) {

    // Creating salt
    let salt = crypto.randomBytes(16).toString('hex');
    // Hashing and using result in callback
    crypto.scrypt(toHash, salt, 64, (err, hashed) => {
        callback(hashed);
    });
}

function sanitizeUsername(username) {
    console.log(username)
    if(username) {
        return validator.isAscii(username);
    }
    return false;
}

router.post('/register', (req, res) => {

    // Extracting user data from request object
    let userData = req.body;

    // Username sanitation with ascii
    if(!sanitizeUsername(userData.username)) {
        res.status(400).send("Invalid Username Format");
        return;
    }
    userData.username = userData.username.toLowerCase();

    if(User.findOne({ username: userData.username }, (err, response) => {
        if(err) {
            console.error(err);
            return;
        }
        else if(response) {
            res.status(409).send("Username in use");
            return;
        }
        else {
            AddUser();
        }
    }))

    function AddUser() {
        let user = new User(userData);

        encryptToArgon(user.password, (hashed) => {
            user.password = hashed;
            user.save((err, registeredUser) => {
                if(err) {
                    console.error(err);
                }
                else {
                    res.status(200).send({ response: "Success" });
                }
            });
        });
    };
});

router.post('/login', (req, res) => {
    // Extracting user data from request object
    let userData = req.body;

    // Username sanitation with ascii
    if(!sanitizeUsername(userData.username)) {
        res.status(400).send("Invalid Username Format");
        return;
    }
    userData.username = userData.username.toLowerCase();

    User.findOne({ username: userData.username }, (err, user) => {
        if(err) {
            console.error(err);
        }
        else {
            if(!user) {
                res.status(401).send("Invalid credentials");
            }
            else {
                try {
                    argon2.verify(user.password, userData.password).then(argon2Match => {
                        if(argon2Match) {
                            res.status(200).send({ response: "Success!"});
                        }
                        else {
                            res.status(401).send("Invalid credentials");
                        }
                    })
                }
                catch (err) {
                    console.error(err);
                }
            }
        }
    })
})


module.exports = router;