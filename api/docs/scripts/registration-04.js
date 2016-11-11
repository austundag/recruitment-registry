'use strict';

const request = require('superagent');

module.exports = function (locals) {
    console.log(`------ start ${module.filename}`);

    return request
        .get('http://localhost:9005/api/v1.0/auth/basic')
        .auth('testparticipant', 'testpassword')
        .then(res => {
            console.log(res.status); // 200
            console.log(res.body.token); // identical to jwtUser from registration
        })
        .then(() => {
            console.log(`------ end ${module.filename}`);
            return locals;
        });
};