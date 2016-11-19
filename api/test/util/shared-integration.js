'use strict';

const request = require('supertest');
const chai = require('chai');
const _ = require('lodash');

const appgen = require('../../app-generator');
const Generator = require('./entity-generator');
const translator = require('./translator');
const comparator = require('./client-server-comparator');

const expect = chai.expect;

class SharedIntegration {
    constructor(generator) {
        this.generator = generator || new Generator();
    }

    setUpFn(store, options = {}) {
        return function (done) {
            appgen.generate(options, function (err, app) {
                if (err) {
                    return done(err);
                }
                store.server = request(app);
                done();
            });
        };
    }

    updateStoreFromCookie(store, res) {
        const cookies = _.get(res, 'header.set-cookie');
        if (cookies) {
            const cookie = cookies.find(cookie => cookie.indexOf('rr-jwt-token=') >= 0);
            if (cookie) {
                const token = cookie.split(';')[0].split('=')[1];
                if (token) {
                    store.auth = token;
                }
            }
        }
    }

    loginFn(store, login) {
        const shared = this;
        return function (done) {
            store.server
                .get('/api/v1.0/auth/basic')
                .auth(login.username, login.password)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    shared.updateStoreFromCookie(store, res);
                    done();
                });
        };
    }

    loginIndexFn(store, history, index) {
        const shared = this;
        return function (done) {
            const login = history.client(index);
            shared.loginFn(store, login)(done);
        };
    }

    logoutFn(store) {
        return function () {
            store.auth = null;
        };
    }

    badLoginFn(store, login) {
        return function (done) {
            store.server
                .get('/api/v1.0/auth/basic')
                .auth(login.username, login.password)
                .expect(401, done);
        };
    }

    createProfileSurveyFn(store, hxSurvey) {
        const generator = this.generator;
        return function (done) {
            const clientSurvey = generator.newSurvey();
            store.post('/profile-survey', clientSurvey, 201)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    hxSurvey.push(clientSurvey, res.body);
                    done();
                });
        };
    }

    verifyProfileSurveyFn(store, hxSurvey, index) {
        return function (done) {
            store.server
                .get('/api/v1.0/profile-survey')
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    expect(res.body.exists).to.equal(true);
                    const survey = res.body.survey;
                    const id = hxSurvey.id(index);
                    expect(survey.id).to.equal(id);
                    hxSurvey.updateServer(index, survey);
                    comparator.survey(hxSurvey.client(index), survey)
                        .then(done, done);
                });
        };
    }

    createUserFn(store, history, user) {
        const generator = this.generator;
        return function (done) {
            if (!user) {
                user = generator.newUser();
            }
            store.post('/users', user, 201)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    history.push(user, { id: res.body.id });
                    done();
                });
        };
    }

    createQxFn(store, hxQuestions) {
        const generator = this.generator;
        return function (done) {
            const clientQuestion = generator.newQuestion();
            store.post('/questions', clientQuestion, 201)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    hxQuestions.push(clientQuestion, res.body);
                    done();
                });
        };
    }

    fillQxFn(store, hxQuestions) {
        return function (done) {
            const id = hxQuestions.lastId();
            store.server
                .get(`/api/v1.0/questions/${id}`)
                .set('Cookie', `rr-jwt-token=${store.auth}`)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    const question = { id, type: res.body.type };
                    const choices = res.body.choices;
                    if (choices) {
                        if (question.type === 'choice') {
                            question.choices = _.map(res.body.choices, choice => ({ id: choice.id }));
                        } else {
                            question.choices = _.map(choices, choice => ({ id: choice.id, type: choice.type }));
                        }
                    }
                    hxQuestions.reloadServer(question);
                    done();
                });
        };
    }

    postSurveyFn(store, survey, hxSurvey) {
        return function (done) {
            store.post('/surveys', survey, 201)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    expect(!!res.body.id).to.equal(true);
                    if (hxSurvey) {
                        hxSurvey.push(survey, res.body);
                    }
                    done();
                });
        };
    }

    createSurveyFn(store, hxSurvey, hxQuestion, qxIndices) {
        const generator = this.generator;
        return function (done) {
            const inputSurvey = generator.newSurvey();
            if (hxQuestion) {
                inputSurvey.questions = qxIndices.map(index => ({
                    id: hxQuestion.server(index).id,
                    required: false
                }));
            }
            store.post('/surveys', inputSurvey, 201)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    hxSurvey.push(inputSurvey, res.body);
                    done();
                });
        };
    }

    createSurveyProfileFn(store, survey) {
        return function (done) {
            store.post('/profile-survey', survey, 201)
                .expect(function (res) {
                    expect(!!res.body.id).to.equal(true);
                })
                .end(done);
        };
    }

    createConsentTypeFn(store, history) {
        const generator = this.generator;
        return function (done) {
            const cst = generator.newConsentType();
            store.post('/consent-types', cst, 201)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    history.pushType(cst, res.body);
                    done();
                });
        };
    }

    createConsentDocumentFn(store, history, typeIndex) {
        const generator = this.generator;
        return function (done) {
            const typeId = history.typeId(typeIndex);
            const cs = generator.newConsentDocument({ typeId });
            store.post('/consent-documents', cs, 201)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    history.push(typeIndex, cs, res.body);
                    done();
                });
        };
    }

    translateConsentTypeFn(store, index, language, hxType) {
        return function (done) {
            const server = hxType.server(index);
            const translation = translator.translateConsentType(server, language);
            store.patch(`/consent-types/text/${language}`, translation, 204)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }
                    hxType.translate(index, language, translation);
                    done();
                });
        };
    }

    translateConsentDocumentFn(store, index, language, history) {
        return function (done) {
            const server = history.server(index);
            const translation = translator.translateConsentDocument(server, language);
            store.patch(`/consent-documents/text/${language}`, translation, 204)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }
                    history.hxDocument.translateWithServer(server, language, translation);
                    done();
                });
        };
    }

}

module.exports = SharedIntegration;
