'use strict';

module.exports = function (locals) {
    console.log(`------ start ${module.filename}`);

    return locals.agent
        .get('http://localhost:9005/api/v1.0/questions')
        .then(res => {
            console.log(res.status); // 200
            const questionList = res.body;
            console.log(JSON.stringify(questionList, undefined, 4));
        })
        .then(() => {
            console.log(`------ end ${module.filename}`);
            return locals;
        });
};
