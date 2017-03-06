'use strict';

/* eslint func-names: 0, no-console: 0 */

module.exports = function (locals) {
    console.log(`------ start ${module.filename}`);

    return locals.agent
        .get('http://localhost:9005/api/v1.0/answered-surveys/1')
        .then((res) => {
            console.log(res.status); // 200
            console.log(JSON.stringify(res.body, undefined, 4)); // survey with answers
        })
        .then(() => {
            console.log(`------ end ${module.filename}`);
            return locals;
        });
};
