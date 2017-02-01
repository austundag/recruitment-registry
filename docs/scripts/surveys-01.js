'use strict';

module.exports = function (locals) {
    console.log(`------ start ${module.filename}`);

    return locals.agent
        .get('http://localhost:9005/api/v1.0/surveys')
        .then(res => {
            console.log(res.status); // 200
            const surveyList = res.body;
            console.log(JSON.stringify(surveyList, undefined, 4));
        })
        .then(() => {
            console.log(`------ end ${module.filename}`);
            return locals;
        });
};