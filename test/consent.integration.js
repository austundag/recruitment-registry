/* global describe,before,it*/
'use strict';
process.env.NODE_ENV = 'test';

const chai = require('chai');
const _ = require('lodash');

const SharedIntegration = require('./util/shared-integration');
const RRSuperTest = require('./util/rr-super-test');
const Generator = require('./util/generator');
const History = require('./util/history');
const ConsentDocumentHistory = require('./util/consent-document-history');
const ConsentCommon = require('./util/consent-common');
const config = require('../config');
const translator = require('./util/translator');
const models = require('../models');

const expect = chai.expect;
const generator = new Generator();
const shared = new SharedIntegration(generator);

describe('consent integration', function () {
    const userCount = 4;
    const typeCount = 12;

    const store = new RRSuperTest();
    const history = new ConsentDocumentHistory(userCount);
    const hxConsent = new History();
    const consentCommon = new ConsentCommon(hxConsent, history);
    const browserMap = new Map();

    before(shared.setUpFn(store));

    it('login as super', shared.loginFn(store, config.superUser));

    for (let i = 0; i < typeCount; ++i) {
        it(`create consent type ${i}`, shared.createConsentTypeFn(store, history));
        it(`add translated (es) consent type ${i}`, shared.translateConsentTypeFn(store, i, 'es', history.hxType));
    }

    for (let i = 0; i < userCount; ++i) {
        const user = generator.newUser();
        it(`create user ${i}`, shared.createUserFn(store, history.hxUser, user));
    }

    const consentSpecs = [
        [0, 1, 2, 3, 4], // consent 0. Sections of types 0, 1, 2, 3, 4
        [8, 5, 10, 11], // consent 1. Sections of types 8, 5, 11, 12
        [2, 3, 6, 7], // consent 2. Sections of types 2, 3, 6, 7
        [8, 11, 9] // consent 3. Sections of types 8, 11, 9
    ];

    consentSpecs.forEach((typeIndices, index) => {
        it(`create consent ${index}`, shared.createConsentFn(store, hxConsent, history, typeIndices));
    });

    _.range(consentSpecs.length).forEach(index => {
        it(`get/verify consent ${index}`, shared.verifyConsentFn(store, hxConsent, index));
    });

    _.range(consentSpecs.length).forEach(index => {
        it(`get/verify consent by name ${index}`, function (done) {
            const name = hxConsent.client(index).name;
            store.get(`/consents/name/${name}`, true, 200)
                .expect(function (res) {
                    const expected = hxConsent.server(index);
                    expect(res.body).to.deep.equal(expected);
                })
                .end(done);
        });
    });

    const listConsentsFn = function (done) {
        store.get('/consents', true, 200)
            .expect(function (res) {
                const expected = hxConsent.listServers();
                expect(res.body).to.deep.equal(expected);
            })
            .end(done);
    };

    it('list/verify consents', listConsentsFn);

    it('delete consent 2', function (done) {
        const id = hxConsent.id(2);
        store.delete(`/consents/${id}`, 204)
            .expect(function () {
                hxConsent.remove(2);
            })
            .end(done);
    });

    it('list/verify consents', listConsentsFn);

    it('logout as super', shared.logoutFn(store));

    const getUserConsentDocumentsFn = function (userIndex, index, signatureIndices) {
        return function (done) {
            const id = hxConsent.id(index);
            store.get(`/consents/${id}/user-documents`, true, 200)
                .expect(function (res) {
                    const typeIndices = consentSpecs[index];
                    const signatures = signatureIndices.reduce((r, i) => {
                        if (Array.isArray(i)) {
                            r[i[0]] = i[1];
                        } else {
                            r[i] = 'en';
                        }
                        return r;
                    }, {});
                    const expected = consentCommon.formExpectedConsent(index, typeIndices, signatures);
                    expect(res.body).to.deep.equal(expected);
                })
                .end(done);
        };
    };

    const getTranslatedUserConsentDocumentsFn = function (userIndex, index, signatureIndices, language) {
        return function (done) {
            const id = hxConsent.id(index);
            store.get(`/consents/${id}/user-documents`, true, 200, { language })
                .expect(function (res) {
                    const typeIndices = consentSpecs[index];
                    const signatures = signatureIndices.reduce((r, i) => {
                        if (Array.isArray(i)) {
                            r[i[0]] = i[1];
                        } else {
                            r[i] = 'en';
                        }
                        return r;
                    }, {});
                    const expected = consentCommon.formTranslatedExpectedConsent(index, typeIndices, signatures, language);
                    expect(res.body).to.deep.equal(expected);
                    translator.isConsentDocumentTranslated(res.body, language);
                })
                .end(done);
        };
    };

    const getUserConsentDocumentsByNameFn = function (userIndex, index, signatureIndices) {
        return function (done) {
            const name = hxConsent.server(index).name;
            store.get(`/consents/name/${name}/user-documents`, true, 200)
                .expect(function (res) {
                    const typeIndices = consentSpecs[index];
                    const signatures = signatureIndices.reduce((r, i) => {
                        if (Array.isArray(i)) {
                            r[i[0]] = i[1];
                        } else {
                            r[i] = 'en';
                        }
                        return r;
                    }, {});
                    const expected = consentCommon.formExpectedConsent(index, typeIndices, signatures);
                    expect(res.body).to.deep.equal(expected);
                })
                .end(done);
        };
    };

    const getTranslatedUserConsentDocumentsByNameFn = function (userIndex, index, signatureIndices, language) {
        return function (done) {
            const name = hxConsent.server(index).name;
            store.get(`/consents/name/${name}/user-documents`, true, 200, { language })
                .expect(function (res) {
                    const typeIndices = consentSpecs[index];
                    const signatures = signatureIndices.reduce((r, i) => {
                        if (Array.isArray(i)) {
                            r[i[0]] = i[1];
                        } else {
                            r[i] = 'en';
                        }
                        return r;
                    }, {});
                    const expected = consentCommon.formTranslatedExpectedConsent(index, typeIndices, signatures, language);
                    expect(res.body).to.deep.equal(expected);
                    translator.isConsentDocumentTranslated(res.body, language);
                })
                .end(done);
        };
    };

    it('login as super', shared.loginFn(store, config.superUser));
    for (let i = 0; i < typeCount; ++i) {
        it(`create/verify consent document of type ${i}`, shared.createConsentDocumentFn(store, history, i));
        it(`add translated (es) consent document ${i}`, shared.translateConsentDocumentFn(store, i, 'es', history));
    }
    it('logout as super', shared.logoutFn(store));

    [0, 1, 3].forEach(consentIndex => {
        it(`get/verify consent ${consentIndex} documents`, function (done) {
            const id = hxConsent.id(consentIndex);
            store.get(`/consents/${id}/documents`, true, 200)
                .expect(function (res) {
                    const typeIndices = consentSpecs[consentIndex];
                    const expected = consentCommon.formExpectedConsent(consentIndex, typeIndices);
                    expect(res.body).to.deep.equal(expected);
                })
                .end(done);
        });

        it(`get/verify translated (es) consent ${consentIndex} documents`, function (done) {
            const id = hxConsent.id(consentIndex);
            store.get(`/consents/${id}/documents`, true, 200, { language: 'es' })
                .expect(function (res) {
                    const typeIndices = consentSpecs[consentIndex];
                    const expected = consentCommon.formTranslatedExpectedConsent(consentIndex, typeIndices, undefined, 'es');
                    expect(res.body).to.deep.equal(expected);
                    translator.isConsentDocumentTranslated(res.body, 'es');
                })
                .end(done);
        });

        it(`get/verify consent ${consentIndex} documents by name`, function (done) {
            const name = hxConsent.server(consentIndex).name;
            store.get(`/consents/name/${name}/documents`, true, 200)
                .expect(function (res) {
                    const typeIndices = consentSpecs[consentIndex];
                    const expected = consentCommon.formExpectedConsent(consentIndex, typeIndices);
                    expect(res.body).to.deep.equal(expected);
                })
                .end(done);
        });

        it(`get/verify translated (es) consent ${consentIndex} documents by name`, function (done) {
            const name = hxConsent.server(consentIndex).name;
            store.get(`/consents/name/${name}/documents`, true, 200, { language: 'es' })
                .expect(function (res) {
                    const typeIndices = consentSpecs[consentIndex];
                    const expected = consentCommon.formTranslatedExpectedConsent(consentIndex, typeIndices, undefined, 'es');
                    expect(res.body).to.deep.equal(expected);
                    translator.isConsentDocumentTranslated(res.body, 'es');
                })
                .end(done);
        });

        _.range(userCount).forEach(userIndex => {
            it(`login as user ${userIndex}`, shared.loginIndexFn(store, history.hxUser, 0));
            it(`get/verify user consent ${consentIndex} documents`, getUserConsentDocumentsFn(userIndex, consentIndex, []));
            it(`get/verify user consent ${consentIndex} documents by name`, getUserConsentDocumentsByNameFn(userIndex, consentIndex, []));
            it(`get/verify translated (es) user consent ${consentIndex} documents`, getTranslatedUserConsentDocumentsFn(userIndex, consentIndex, [], 'es'));
            it(`get/verify translated (es) user consent ${consentIndex} documents by name`, getTranslatedUserConsentDocumentsByNameFn(userIndex, consentIndex, [], 'es'));
            it(`logout as user ${userIndex}`, shared.logoutFn(store));
        });
    });

    const signDocumentsFn = (function () {
        let browserIndex = 0;

        return function (userIndex, index, newSignatureIndices, language) {
            return function (done) {
                language = language || 'en';
                const consentDocumentIds = newSignatureIndices.map(i => history.id(i));
                const input = { consentDocumentIds };
                if (language) {
                    input.language = language;
                }
                ++browserIndex;
                const userAgent = `Browser-${browserIndex}`;
                const ip = `9848.3${browserIndex}.838`;
                const userId = history.hxUser.id(userIndex);
                consentDocumentIds.forEach(documentId => browserMap.set(`${userId}.${documentId}`, { userAgent, ip }));
                const header = {
                    'User-Agent': userAgent,
                    'X-Forwarded-For': [ip, `111.${browserIndex}0.999`]
                };
                store.post('/consent-signatures/bulk', input, 201, header).end(done);
            };
        };
    })();

    it(`login as user 0`, shared.loginIndexFn(store, history.hxUser, 0));
    it('user 0 signs consent 0 (1, 2, 3)', signDocumentsFn(0, 0, [1, 2, 3], 'sp'));
    it('logout as user 0', shared.logoutFn(store));

    it(`login as user 1`, shared.loginIndexFn(store, history.hxUser, 1));
    it('user 1 signs consent 1 (5, 10, 11)', signDocumentsFn(1, 1, [5, 10, 11], 'en'));
    it('logout as user 1', shared.logoutFn(store));

    it(`login as user 2`, shared.loginIndexFn(store, history.hxUser, 2));
    it('user 2 signs consent 3 (8, 9, 10)', signDocumentsFn(2, 3, [8, 9, 10]));
    it('logout as user 2', shared.logoutFn(store));

    it(`login as user 3`, shared.loginIndexFn(store, history.hxUser, 3));
    it('user 3 signs consent 0 (0, 2, 3, 4)', signDocumentsFn(3, 0, [0, 2, 3, 4]));
    it('logout as user 3', shared.logoutFn(store));

    it(`login as user 0`, shared.loginIndexFn(store, history.hxUser, 0));
    it(`get/verify user 0 consent 0 documents`, getUserConsentDocumentsFn(0, 0, [
        [1, 'sp'],
        [2, 'sp'],
        [3, 'sp']
    ]));
    it(`get/verify user 0 consent 0 documents by name`, getUserConsentDocumentsByNameFn(0, 0, [
        [1, 'sp'],
        [2, 'sp'],
        [3, 'sp']
    ]));
    it('logout as user 0', shared.logoutFn(store));

    it(`login as user 1`, shared.loginIndexFn(store, history.hxUser, 1));
    it(`get/verify user 1 consent 1 documents`, getUserConsentDocumentsFn(1, 1, [5, 10, 11]));
    it('logout as user 1', shared.logoutFn(store));

    it(`login as user 2`, shared.loginIndexFn(store, history.hxUser, 2));
    it(`get/verify user 2 consent 3 documents`, getUserConsentDocumentsFn(2, 3, [8, 9, 10]));
    it('logout as user 2', shared.logoutFn(store));

    it(`login as user 3`, shared.loginIndexFn(store, history.hxUser, 3));
    it(`get/verify user 3 consent 0 documents`, getUserConsentDocumentsFn(3, 0, [0, 2, 3, 4]));
    it('logout as user 3', shared.logoutFn(store));

    it('login as super', shared.loginFn(store, config.superUser));
    [2, 10, 8, 4].forEach(typeIndex => {
        it(`create/verify consent document of type ${typeIndex}`, shared.createConsentDocumentFn(store, history, typeIndex));
        it(`add translated (es) consent document ${typeIndex}`, shared.translateConsentDocumentFn(store, typeIndex, 'es', history));
    });
    it('logout as super', shared.logoutFn(store));

    it(`login as user 0`, shared.loginIndexFn(store, history.hxUser, 0));
    it(`get/verify user 0 consent 0 documents`, getUserConsentDocumentsFn(0, 0, [
        [1, 'sp'],
        [3, 'sp']
    ]));
    it('logout as user 0', shared.logoutFn(store));

    it(`login as user 1`, shared.loginIndexFn(store, history.hxUser, 1));
    it(`get/verify user 1 consent 1 documents`, getUserConsentDocumentsFn(1, 1, [5, 11]));
    it(`get/verify user 1 translated (es) consent 1 documents`, getTranslatedUserConsentDocumentsFn(1, 1, [5, 11], 'es'));
    it('logout as user 1', shared.logoutFn(store));

    it(`login as user 2`, shared.loginIndexFn(store, history.hxUser, 2));
    it(`get/verify user 2 consent 3 documents`, getUserConsentDocumentsFn(2, 3, [9]));
    it(`get/verify user 2 translated (es) consent 3 documents`, getTranslatedUserConsentDocumentsFn(2, 3, [9], 'es'));
    it('logout as user 2', shared.logoutFn(store));

    it(`login as user 3`, shared.loginIndexFn(store, history.hxUser, 3));
    it(`get/verify user 3 consent 0 documents`, getUserConsentDocumentsFn(3, 0, [0, 3]));
    it(`get/verify user 3 translated (es) consent 0 documents`, getTranslatedUserConsentDocumentsFn(3, 0, [0, 3], 'es'));
    it('logout as user 3', shared.logoutFn(store));

    it(`login as user 0`, shared.loginIndexFn(store, history.hxUser, 0));
    it('user 0 signs consent 0 (0, 2)', signDocumentsFn(0, 0, [0, 2], 'en'));
    it('logout as user 0', shared.logoutFn(store));

    it(`login as user 1`, shared.loginIndexFn(store, history.hxUser, 1));
    it('user 1 signs consent 1 (8, 10)', signDocumentsFn(1, 1, [8, 10], 'sp'));
    it('logout as user 1', shared.logoutFn(store));

    it(`login as user 2`, shared.loginIndexFn(store, history.hxUser, 2));
    it('user 2 signs consent 3 (8, 11)', signDocumentsFn(2, 3, [8, 11]));
    it('logout as user 2', shared.logoutFn(store));

    it(`login as user 3`, shared.loginIndexFn(store, history.hxUser, 3));
    it('user 3 signs consent 0 (2, 4)', signDocumentsFn(3, 0, [2, 4]));
    it('logout as user 3', shared.logoutFn(store));

    it(`login as user 0`, shared.loginIndexFn(store, history.hxUser, 0));
    it(`get/verify user 0 consent 0 documents`, getUserConsentDocumentsFn(0, 0, [0, [1, 'sp'], 2, [3, 'sp']]));
    it('logout as user 0', shared.logoutFn(store));

    it(`login as user 1`, shared.loginIndexFn(store, history.hxUser, 1));
    it(`get/verify user 1 consent 1 documents`, getUserConsentDocumentsFn(1, 1, [5, [8, 'sp'],
        [10, 'sp'], 11
    ]));
    it('logout as user 1', shared.logoutFn(store));

    it(`login as user 2`, shared.loginIndexFn(store, history.hxUser, 2));
    it(`get/verify user 2 consent 3 documents`, getUserConsentDocumentsFn(2, 3, [8, 9, 11]));
    it('logout as user 2', shared.logoutFn(store));

    it(`login as user 3`, shared.loginIndexFn(store, history.hxUser, 3));
    it(`get/verify user 3 consent 0 documents`, getUserConsentDocumentsFn(3, 0, [0, 2, 3, 4]));
    it('logout as user 3', shared.logoutFn(store));

    it('login as super', shared.loginFn(store, config.superUser));
    [2, 10].forEach(typeIndex => {
        it(`create/verify consent document of type ${typeIndex}`, shared.createConsentDocumentFn(store, history, typeIndex));
        it(`add translated (es) consent document ${typeIndex}`, shared.translateConsentDocumentFn(store, typeIndex, 'es', history));
    });
    it('logout as super', shared.logoutFn(store));

    it('update history for type 2', function (done) {
        const typeId = history.typeId(2);
        store.get(`/consent-documents/type-id/${typeId}/update-comments`, false, 200)
            .expect(function (res) {
                const servers = history.serversHistory().filter(h => (h.typeId === typeId));
                const comments = _.map(servers, 'updateComment');
                expect(res.body).to.deep.equal(comments);
            })
            .end(done);
    });

    it('translated update history for type 2', function (done) {
        const typeId = history.typeId(2);
        store.get(`/consent-documents/type-id/${typeId}/update-comments`, false, 200, { language: 'es' })
            .expect(function (res) {
                const servers = history.translatedServersHistory('es').filter(h => (h.typeId === typeId));
                const comments = _.map(servers, 'updateComment');
                expect(res.body).to.deep.equal(comments);
            })
            .end(done);
    });

    it('check ip and browser (user-agent) of signature', function () {
        const query = 'select registry_user.id as "userId", consent_document.id as "documentId", ip, user_agent as "userAgent" from consent_signature, consent_document, registry_user where consent_signature.user_id = registry_user.id and consent_signature.consent_document_id = consent_document.id';
        return models.sequelize.query(query, { type: models.sequelize.QueryTypes.SELECT })
            .then(result => {
                result.forEach(({ userId, documentId, userAgent, ip }) => {
                    const expected = browserMap.get(`${userId}.${documentId}`);
                    expect({ userAgent, ip }).to.deep.equal(expected);
                });
            });
    });
});