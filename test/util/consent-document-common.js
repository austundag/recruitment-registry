'use strict';

const chai = require('chai');
const _ = require('lodash');

const models = require('../../models');
const SPromise = require('../../lib/promise');

const translator = require('./translator');
const comparator = require('./comparator');
const errSpec = require('./err-handler-spec');

const expect = chai.expect;

const BaseTests = class BaseTests {
    constructor({ generator, hxConsentDocument }) {
        this.generator = generator;
        this.hxConsentDocument = hxConsentDocument;
    }

    createConsentDocumentFn(typeIndex) {
        const self = this;
        return function createConsentDocument() {
            const typeId = self.hxConsentDocument.typeId(typeIndex);
            const consentDoc = self.generator.newConsentDocument({ typeId });
            return self.createConsentDocumentPx(consentDoc)
                .then((server) => {
                    self.hxConsentDocument.push(typeIndex, consentDoc, server);
                });
        };
    }

    translateConsentDocumentFn(index, language) {
        const self = this;
        return function translateConsentDocument() {
            const server = self.hxConsentDocument.server(index);
            const translation = translator.translateConsentDocument(server, language);
            return self.translateConsentDocumentPx(translation, language)
                .then(() => {
                    const hxDocument = self.hxConsentDocument.hxDocument;
                    hxDocument.translateWithServer(server, language, translation);
                });
        };
    }

    getConsentDocumentFn(typeIndex) {
        const self = this;
        return function getConsentDocument() {
            const consentDocument = self.hxConsentDocument.server(typeIndex);
            return self.getConsentDocumentPx(consentDocument.id)
                .then((result) => {
                    expect(result).to.deep.equal(consentDocument);
                });
        };
    }

    getConsentDocumentByTypeIdFn(typeIndex) {
        const self = this;
        return function getConsentDocumentByTypeName() {
            const hx = self.hxConsentDocument;
            const typeId = hx.type(typeIndex).id;
            return self.getConsentDocumentByTypeIdPx(typeId)
                .then((result) => {
                    const expected = hx.server(typeIndex);
                    expect(result).to.deep.equal(expected);
                });
        };
    }

    errorGetConsentDocumentByTypeIdFn(typeId, errKey) {
        const self = this;
        return function errprGetConsentDocumentByTypeName() {
            const errFn = errSpec.expectedErrorHandlerFn(errKey);
            return self.errorGetConsentDocumentByTypeIdPx(typeId)
                .then(errSpec.throwingHandler, errFn);
        };
    }

    getTranslatedConsentDocumentFn(index, language) {
        const self = this;
        return function getTranslatedConsentDocument() {
            const hx = self.hxConsentDocument;
            const id = hx.id(index);
            return self.getTranslatedConsentDocumentPx(id, language)
                .then((result) => {
                    const expected = hx.hxDocument.translatedServer(index, language);
                    expect(result).to.deep.equal(expected);
                });
        };
    }

    listConsentDocumentsFn(indices) {
        const self = this;
        return function listConsentDocuments() {
            const hx = self.hxConsentDocument;
            const css = indices.map(index => hx.server(index));
            return SPromise.all(css.map(cs => self.models.consentDocument.getConsentDocument(cs.id)
                .then((result) => {
                    expect(result).to.deep.equal(cs);
                })));
        };
    }

    listConsentDocumentsSummaryFn(indices) {
        const self = this;
        return function listConsentDocuments() {
            const hx = self.hxConsentDocument;
            const css = indices.map(index => hx.server(index));
            return self.models.consentDocument.listConsentDocuments({ noTypeExpand: true })
                .then((consentDocuments) => {
                    const expected = _.sortBy(css, 'id');
                    comparator.consentDocuments(expected, consentDocuments);
                });
        };
    }

    listTranslatedConsentDocumentsFn(indices, language) {
        const self = this;
        return function listConsentDOcuments() {
            const hx = self.hxConsentDocument;
            const css = indices.map(index => hx.hxDocument.translatedServer(index, language));
            return SPromise.all(css.map((cs) => {
                const options = { language };
                return self.models.consentDocument.getConsentDocument(cs.id, options)
                    .then((result) => {
                        expect(result).to.deep.equal(cs);
                    });
            }));
        };
    }

    listAllConsentDocumentsFn() {
        const self = this;
        return function listAllConsentDocuments() {
            const hx = self.hxConsentDocument;
            const options = { noTypeExpand: true, paranoid: false };
            return self.models.consentDocument.listConsentDocuments(options)
                .then((consentDocuments) => {
                    const expected = hx.serversHistory();
                    comparator.consentDocuments(expected, consentDocuments);
                    return expected;
                });
        };
    }
};

const SpecTests = class ConsentTypeSpecTests extends BaseTests {
    constructor(params) {
        super(params);
        this.models = models;
    }

    createConsentDocumentPx(consentDoc) {
        return this.models.consentDocument.createConsentDocument(consentDoc);
    }

    translateConsentDocumentPx(translation, language) {
        return this.models.consentDocument.updateConsentDocumentText(translation, language);
    }

    getConsentDocumentPx(id) {
        return this.models.consentDocument.getConsentDocument(id);
    }

    getConsentDocumentByTypeIdPx(typeId) {
        return this.models.consentDocument.getConsentDocumentByTypeId(typeId);
    }

    errorGetConsentDocumentByTypeIdPx(typeId) {
        return this.models.consentDocument.getConsentDocumentByTypeId(typeId);
    }

    getTranslatedConsentDocumentPx(id, language) {
        return this.models.consentDocument.getConsentDocument(id, { language });
    }
};

const IntegrationTests = class ConsentTypeIntegrationTests extends BaseTests {
    constructor(rrSuperTest, params) {
        super(params);
        this.rrSuperTest = rrSuperTest;
    }

    createConsentDocumentPx(consentDoc) {
        return this.rrSuperTest.post('/consent-documents', consentDoc, 201)
            .then(res => res.body);
    }

    translateConsentDocumentPx(translation, language) {
        return this.rrSuperTest.patch(`/consent-documents/text/${language}`, translation, 204);
    }

    getConsentDocumentPx(id) {
        return this.rrSuperTest.get(`/consent-documents/${id}`, false, 200)
            .then(res => res.body);
    }

    getConsentDocumentByTypeIdPx(typeId) {
        return this.rrSuperTest.get(`/consent-documents/type/${typeId}`, false, 200)
            .then(res => res.body);
    }

    getTranslatedConsentDocumentPx(id, language) {
        return this.rrSuperTest.get(`/consent-documents/${id}`, false, 200, { language })
            .then(res => res.body);
    }
};

module.exports = {
    SpecTests,
    IntegrationTests,
};
