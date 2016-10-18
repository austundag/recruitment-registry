/* global describe,before,it*/
'use strict';
process.env.NODE_ENV = 'test';

const chai = require('chai');
const _ = require('lodash');

const SharedSpec = require('./util/shared-spec');
const Generator = require('./util/entity-generator');
const History = require('./util/entity-history');
const ConsentDocumentHistory = require('./util/consent-document-history');
const models = require('../models');
const textTableMethods = require('../models/text-table-methods');

const expect = chai.expect;

const User = models.User;
const generator = new Generator();
const shared = new SharedSpec(generator);
const Consent = models.Consent;
const ConsentType = models.ConsentType;
const ConsentDocument = models.ConsentDocument;
const ConsentSignature = models.ConsentSignature;

const textHandler = textTableMethods(models.sequelize, 'consent_document_text', 'consentDocumentId', ['content', 'updateComment']);

describe('consent document/type/signature unit', function () {
    const userCount = 4;

    const history = new ConsentDocumentHistory(userCount);
    const hxConsent = new History();

    before(shared.setUpFn());

    const verifyConsentTypeInListFn = function () {
        return function () {
            return ConsentType.listConsentTypes()
                .then(result => {
                    const types = history.listTypes();
                    expect(result).to.deep.equal(types);
                });
        };
    };

    for (let i = 0; i < 2; ++i) {
        it(`create consent type ${i}`, shared.createConsentTypeFn(history));
        it(`verify consent type list`, verifyConsentTypeInListFn);
        it(`add translated (es) consent type ${i}`, shared.translateConsentTypeFn(i, 'es', history.hxType));
    }

    for (let i = 0; i < userCount; ++i) {
        it(`create user ${i}`, shared.createUser(history.hxUser));
    }

    it('error: no consent documents of existing types', function () {
        return User.listConsentDocuments(history.userId(0))
            .then(shared.throwingHandler, shared.expectedErrorHandler('noSystemConsentDocuments'));
    });

    const verifyConsentDocumentFn = function (typeIndex) {
        return function () {
            const cs = history.server(typeIndex);
            return ConsentDocument.getConsentDocument(cs.id)
                .then(result => {
                    expect(result).to.deep.equal(cs);
                });
        };
    };

    const verifyTranslatedConsentDocumentFn = function (index, language) {
        return function () {
            const id = history.id(index);
            return ConsentDocument.getConsentDocument(id, { language })
                .then(result => {
                    const expected = history.hxDocument.translatedServer(index, language);
                    expect(result).to.deep.equal(expected);
                });
        };
    };

    for (let i = 0; i < 2; ++i) {
        it(`create consent document of type ${i}`, shared.createConsentDocumentFn(history, i));
        it(`verify consent document of type ${i}`, verifyConsentDocumentFn(i));
        it(`add translated (es) consent document ${i}`, shared.translateConsentDocumentFn(i, 'es', history.hxDocument));
        it(`verify translated (es) consent document of type ${i}`, verifyTranslatedConsentDocumentFn(i, 'es'));
    }

    const verifyConsentDocumentsFn = function (userIndex, expectedIndices) {
        return function () {
            return User.listConsentDocuments(history.userId(userIndex))
                .then(consentDocuments => {
                    const expected = history.serversInList(expectedIndices);
                    expect(consentDocuments).to.deep.equal(expected);
                    return expected;
                })
                .then(() => {
                    const css = expectedIndices.map(index => history.server(index));
                    return models.sequelize.Promise.all(css.map(cs => {
                        return ConsentDocument.getConsentDocument(cs.id)
                            .then(result => {
                                expect(result).to.deep.equal(cs);
                            });
                    }));
                });
        };
    };

    const verifyTranslatedConsentDocumentsFn = function (userIndex, expectedIndices, language) {
        return function () {
            return User.listConsentDocuments(history.userId(userIndex), undefined, undefined, language)
                .then(consentDocuments => {
                    const expected = history.translatedServersInList(expectedIndices, language);
                    expect(consentDocuments).to.deep.equal(expected);
                    return expected;
                })
                .then(() => {
                    const css = expectedIndices.map(index => history.hxDocument.translatedServer(index, language));
                    return models.sequelize.Promise.all(css.map(cs => {
                        return ConsentDocument.getConsentDocument(cs.id, { language })
                            .then(result => {
                                expect(result).to.deep.equal(cs);
                            });
                    }));
                });
        };
    };

    for (let i = 0; i < 4; ++i) {
        it(`verify consent documents required for user ${i}`, verifyConsentDocumentsFn(i, [0, 1]));
        it(`verify translated consent documents required for user ${i}`, verifyTranslatedConsentDocumentsFn(i, [0, 1], 'es'));
    }

    const signConsentTypeFn = function (userIndex, typeIndex, language) {
        return function () {
            const consentDocumentId = history.id(typeIndex);
            const userId = history.userId(userIndex);
            history.sign(typeIndex, userIndex, language);
            if (language) {
                return ConsentSignature.createSignature(userId, consentDocumentId, language);
            } else {
                return ConsentSignature.createSignature(userId, consentDocumentId);
            }
        };
    };

    it('user 0 signs consent document of type 0', signConsentTypeFn(0, 0));
    it('user 0 signs consent document of type 1', signConsentTypeFn(0, 1));
    it('user 1 signs consent document of type 0', signConsentTypeFn(1, 0, 'en'));
    it('user 1 signs consent document of type 1', signConsentTypeFn(1, 1, 'sp'));
    it('user 2 signs consent document of type 0', signConsentTypeFn(2, 0));
    it('user 3 signs consent document of type 1', signConsentTypeFn(3, 1));

    it('verify consent documents required for user 0', verifyConsentDocumentsFn(0, []));
    it('verify consent documents required for user 1', verifyConsentDocumentsFn(1, []));
    it('verify consent documents required for user 2', verifyConsentDocumentsFn(2, [1]));
    it('verify consent documents required for user 3', verifyConsentDocumentsFn(3, [0]));

    it('error: invalid user signs already signed consent document of type 0 ', function () {
        const consentDocumentId = history.activeConsentDocuments[0].id;
        return ConsentSignature.createSignature(999, consentDocumentId)
            .then(shared.throwingHandler, err => {
                expect(err).is.instanceof(models.sequelize.ForeignKeyConstraintError);
            });
    });

    it('error: user 0 signs invalid consent document', function () {
        const userId = history.userId(0);
        return ConsentSignature.createSignature(userId, 999)
            .then(shared.throwingHandler, err => {
                expect(err).is.instanceof(models.sequelize.ForeignKeyConstraintError);
            });
    });

    it('add consent type 2', shared.createConsentTypeFn(history));
    it(`verify the new consent type in the list`, verifyConsentTypeInListFn);

    it('error: no consent document of existing types', function () {
        return User.listConsentDocuments(history.userId(2))
            .then(shared.throwingHandler, shared.expectedErrorHandler('noSystemConsentDocuments'));
    });

    it('create consent document of type 2', shared.createConsentDocumentFn(history, 2));
    it(`verify consent document of type 2)`, verifyConsentDocumentFn(2));

    it('verify consent documents required for user 0', verifyConsentDocumentsFn(0, [2]));
    it('verify consent documents required for user 1', verifyConsentDocumentsFn(1, [2]));
    it('verify consent documents required for user 2', verifyConsentDocumentsFn(2, [1, 2]));
    it('verify consent documents required for user 3', verifyConsentDocumentsFn(3, [0, 2]));

    it('user 2 signs consent document of type 2', signConsentTypeFn(2, 2, 'en'));
    it('verify consent documents required for user 2', verifyConsentDocumentsFn(2, [1]));

    it('create consent document of type 1', shared.createConsentDocumentFn(history, 1));
    it(`verify consent document of type 1`, verifyConsentDocumentFn(1));

    it('verify consent document required for user 0', verifyConsentDocumentsFn(0, [1, 2]));
    it('verify consent document required for user 1', verifyConsentDocumentsFn(1, [1, 2]));
    it('verify consent document required for user 2', verifyConsentDocumentsFn(2, [1]));
    it('verify consent document required for user 3', verifyConsentDocumentsFn(3, [0, 1, 2]));

    it('user 1 signs consent document of type 2', signConsentTypeFn(1, 2, 'sp'));
    it('verify consent documents required for user 1', verifyConsentDocumentsFn(1, [1]));

    it('create consent document of type 0', shared.createConsentDocumentFn(history, 0));
    it(`verify consent document of type 0)`, verifyConsentDocumentFn(0));

    it('verify consent documents required for user 0', verifyConsentDocumentsFn(0, [0, 1, 2]));
    it('verify consent documents required for user 1', verifyConsentDocumentsFn(1, [0, 1]));
    it('verify consent documents required for user 2', verifyConsentDocumentsFn(2, [0, 1]));
    it('verify consent documents required for user 3', verifyConsentDocumentsFn(3, [0, 1, 2]));

    it('user 2 signs consent document of type 1', signConsentTypeFn(2, 1));
    it('user 3 signs consent document of type 1', signConsentTypeFn(3, 1));

    it('verify consent documents required for user 0', verifyConsentDocumentsFn(0, [0, 1, 2]));
    it('verify consent documents required for user 1', verifyConsentDocumentsFn(1, [0, 1]));
    it('verify consent documents required for user 2', verifyConsentDocumentsFn(2, [0]));
    it('verify consent documents required for user 3', verifyConsentDocumentsFn(3, [0, 2]));

    it('create consent document of type 1', shared.createConsentDocumentFn(history, 1));
    it(`verify consent document of type 1)`, verifyConsentDocumentFn(1));

    it('verify consent document required for user 0', verifyConsentDocumentsFn(0, [0, 1, 2]));
    it('verify consent document required for user 1', verifyConsentDocumentsFn(1, [0, 1]));
    it('verify consent document required for user 2', verifyConsentDocumentsFn(2, [0, 1]));
    it('verify consent document required for user 3', verifyConsentDocumentsFn(3, [0, 1, 2]));

    it('user 0 signs consent document of type 1', signConsentTypeFn(0, 1));
    it('verify consent documents required for user 0', verifyConsentDocumentsFn(0, [0, 2]));
    it('user 0 signs consent document of type 2', signConsentTypeFn(0, 2, 'en'));
    it('verify consent documents required for user 0', verifyConsentDocumentsFn(0, [0]));
    it('user 0 signs consent document of type 0', signConsentTypeFn(0, 0, 'sp'));
    it('verify consent documents required for user 0', verifyConsentDocumentsFn(0, []));

    it(`create consent from types 0, 1, 2`, function () {
        const sections = [0, 1, 2].map(typeIndex => history.typeId(typeIndex));
        const clientConsent = generator.newConsent({ sections });
        return Consent.createConsent(clientConsent)
            .then(result => hxConsent.pushWithId(clientConsent, result.id));
    });

    it('error: delete consent type when on a consent', function () {
        const id = history.typeId(1);
        return ConsentType.deleteConsentType(id)
            .then(shared.throwingHandler, shared.expectedErrorHandler('consentTypeDeleteOnConsent'))
            .then(() => {
                const consentId = hxConsent.id(0);
                return Consent.deleteConsent(consentId);
            });
    });

    it('delete consent type 1', function () {
        const id = history.typeId(1);
        return ConsentType.deleteConsentType(id)
            .then(() => {
                history.deleteType(1);
                return ConsentType.listConsentTypes()
                    .then(result => {
                        const types = history.listTypes();
                        expect(result).to.deep.equal(types);
                    });
            });
    });

    it('verify consent documents required for user 0', verifyConsentDocumentsFn(0, []));
    it('verify consent documents required for user 1', verifyConsentDocumentsFn(1, [0]));
    it('verify consent documents required for user 2', verifyConsentDocumentsFn(2, [0]));
    it('verify consent documents required for user 3', verifyConsentDocumentsFn(3, [0, 2]));

    const verifySignatureExistenceFn = function (userIndex) {
        return function () {
            const userId = history.userId(userIndex);
            return ConsentSignature.getSignatureHistory(userId)
                .then(result => {
                    const expected = _.sortBy(history.signatures[userIndex], 'id');
                    expect(result).to.deep.equal(expected);
                });
        };
    };

    for (let i = 0; i < userCount; ++i) {
        it(`verify all signings still exists for user ${i}`, verifySignatureExistenceFn(i));
    }

    it('verify all consent documents still exists', function () {
        const queryParams = { raw: true, attributes: ['id', 'typeId'], order: ['id'] };
        const queryParamsAll = Object.assign({}, { paranoid: false }, queryParams);
        return ConsentDocument.findAll(queryParamsAll)
            .then(consentDocuments => textHandler.updateAllTexts(consentDocuments))
            .then(consentDocuments => {
                expect(consentDocuments).to.deep.equal(history.serversHistory());
            })
            .then(() => {
                return ConsentDocument.findAll(queryParams)
                    .then((consentDocuments => textHandler.updateAllTexts(consentDocuments)));
            })
            .then(consentDocuments => {
                const expected = _.sortBy([history.server(0), history.server(2)], 'id');
                expect(consentDocuments).to.deep.equal(expected);
            });
    });
});
