/* global it */

'use strict';

/* eslint no-param-reassign: 0, max-len: 0 */

const chai = require('chai');
const _ = require('lodash');

const config = require('../../config');

const appgen = require('../../app-generator');
const models = require('../../models');
const Generator = require('./generator');
const comparator = require('./comparator');
const errHandler = require('./err-handler-spec');

const expect = chai.expect;

class SharedIntegration {
    constructor(rrSuperTest, generator) {
        this.generator = generator || new Generator();
        this.rrSuperTest = rrSuperTest;
    }

    setUpFn(options) {
        const rrSuperTest = this.rrSuperTest;
        return function setup(done) {
            appgen.generate(options || { models }, (err, app) => {
                if (err) {
                    return done(err);
                }
                rrSuperTest.initialize(app);
                return done();
            });
        };
    }

    static setUpMultiFn(rrSuperTests, options = {}) {
        return function setupMulti(done) {
            appgen.generate(options, (err, app) => {
                if (err) {
                    return done(err);
                }
                rrSuperTests.forEach(rrSuperTest => rrSuperTest.initialize(app));
                return done();
            });
        };
    }

    setUpErrFn(options = {}) { // eslint-disable-line class-methods-use-this
        return function setupErr(done) {
            appgen.generate(options, (err) => {
                if (!err) {
                    return done(new Error('Expected error did not happen.'));
                }
                return done();
            });
        };
    }

    loginFn(user) {
        const rrSuperTest = this.rrSuperTest;
        return function login() {
            const fullUser = Object.assign({ id: 1, role: 'admin' }, user);
            return rrSuperTest.authBasic(fullUser);
        };
    }

    loginIndexFn(hxUser, index) {
        const self = this;
        return function loginIndex() {
            const user = _.cloneDeep(hxUser.client(index));
            user.username = user.username || user.email.toLowerCase();
            user.id = hxUser.id(index);
            return self.rrSuperTest.authBasic(user);
        };
    }

    logoutFn() {
        const rrSuperTest = this.rrSuperTest;
        return function logout() {
            rrSuperTest.resetAuth();
        };
    }

    badLoginFn(login) {
        const rrSuperTest = this.rrSuperTest;
        return function badLogin() {
            return rrSuperTest.authBasic(login, 401);
        };
    }

    createProfileSurveyFn(hxSurvey) {
        const generator = this.generator;
        const rrSuperTest = this.rrSuperTest;
        return function createProfileSurvey(done) {
            const clientSurvey = generator.newSurvey();
            rrSuperTest.post('/profile-survey', clientSurvey, 201)
                .end((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    const userId = rrSuperTest.userId;
                    const server = { id: res.body.id, authorId: userId };
                    Object.assign(server, clientSurvey);
                    hxSurvey.push(clientSurvey, server);
                    return done();
                });
        };
    }

    verifyProfileSurveyFn(hxSurvey, index) {
        const rrSuperTest = this.rrSuperTest;
        return function verifyProfileSurvey(done) {
            rrSuperTest.get('/profile-survey', false, 200)
                .expect((res) => {
                    expect(res.body.exists).to.equal(true);
                    const survey = res.body.survey;
                    const id = hxSurvey.id(index);
                    expect(survey.id).to.equal(id);
                    const expected = _.cloneDeep(hxSurvey.server(index));
                    if (rrSuperTest.userRole !== 'admin') {
                        delete expected.authorId;
                    }
                    comparator.survey(expected, survey);
                    hxSurvey.updateServer(index, survey);
                })
                .end(done);
        };
    }

    createUserFn(history, user, override) {
        const generator = this.generator;
        const rrSuperTest = this.rrSuperTest;
        return function createUser() {
            if (!user) {
                user = generator.newUser(override);
            }
            return rrSuperTest.post('/users', user, 201)
                .then((res) => {
                    const server = Object.assign({ id: res.body.id }, user);
                    history.push(user, server);
                });
        };
    }

    createSurveyProfileFn(survey) {
        const rrSuperTest = this.rrSuperTest;
        return function createSurveyProfile(done) {
            rrSuperTest.post('/profile-survey', survey, 201)
                .expect((res) => {
                    expect(!!res.body.id).to.equal(true);
                })
                .end(done);
        };
    }

    createConsentFn(hxConsent, hxConsentDocument, typeIndices) {
        const rrSuperTest = this.rrSuperTest;
        const generator = this.generator;
        return function createConsent(done) {
            const sections = typeIndices.map(typeIndex => hxConsentDocument.typeId(typeIndex));
            const clientConsent = generator.newConsent({ sections });
            rrSuperTest.post('/consents', clientConsent, 201)
                .expect((res) => {
                    hxConsent.pushWithId(clientConsent, res.body.id);
                })
                .end(done);
        };
    }

    verifyConsentFn(hxConsent, index) {
        const rrSuperTest = this.rrSuperTest;
        return function verifyConsent(done) {
            const id = hxConsent.id(index);
            rrSuperTest.get(`/consents/${id}`, true, 200)
                .expect((res) => {
                    const expected = hxConsent.server(index);
                    expect(res.body).to.deep.equal(expected);
                })
                .end(done);
        };
    }

    signConsentTypeFn(hxConsentDocument, userIndex, typeIndex) {
        const rrSuperTest = this.rrSuperTest;
        return function signConsentType(done) {
            const consentDocumentId = hxConsentDocument.id(typeIndex);
            hxConsentDocument.sign(typeIndex, userIndex);
            rrSuperTest.post('/consent-signatures', { consentDocumentId }, 201).end(done);
        };
    }

    bulkSignConsentTypeFn(hxConsentDocument, userIndex, typeIndices) {
        const rrSuperTest = this.rrSuperTest;
        return function bulkSignConsentType(done) {
            const consentDocumentIds = typeIndices.map(typeIndex => hxConsentDocument.id(typeIndex));
            typeIndices.forEach(typeIndex => hxConsentDocument.sign(typeIndex, userIndex));
            rrSuperTest.post('/consent-signatures/bulk', { consentDocumentIds }, 201).end(done);
        };
    }

    verifyUserAudit() {
        const rrSuperTest = this.rrSuperTest;
        it('login as super', this.loginFn(config.superUser));

        it('verify user audit', function vua() {
            const userAudit = rrSuperTest.getUserAudit();
            return rrSuperTest.get('/users', true, 200, { role: 'all' })
                .then(res => new Map(res.body.map(user => [user.username, user.id])))
                .then(userMap => userAudit.map(({ username, operation, endpoint }) => {
                    const userId = userMap.get(username);
                    return { userId, operation, endpoint };
                }))
                .then((expected) => {
                    const px = rrSuperTest.get('/user-audits', true, 200);
                    return px.then(resAudit => expect(resAudit.body).to.deep.equal(expected));
                });
        });

        it('logout as super', this.logoutFn());
    }

    verifyErrorMessage(res, code, ...params) { // eslint-disable-line class-methods-use-this
        return errHandler.verifyErrorMessage(res, code, ...params);
    }

    verifyErrorMessageLang(res, language, code, ...params) { // eslint-disable-line class-methods-use-this
        return errHandler.verifyErrorMessageLang(res, language, code, ...params);
    }
}

module.exports = SharedIntegration;
