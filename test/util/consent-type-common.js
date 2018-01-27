'use strict';

const chai = require('chai');

const models = require('../../models');
const translator = require('./translator');

const expect = chai.expect;

const BaseTests = class BaseTests {
    constructor({ generator, hxConsentType }) {
        this.generator = generator;
        this.hxConsentType = hxConsentType;
    }

    createConsentTypeFn() {
        const self = this;
        return function createConsentType() {
            const consentType = self.generator.newConsentType();
            return self.createConsentTypePx(consentType)
                .then(server => self.hxConsentType.pushWithId(consentType, server.id));
        };
    }

    getConsentTypeFn(index) {
        const self = this;
        return function getConsentType() {
            const consentType = self.hxConsentType.server(index);
            return self.getConsentTypePx(consentType.id)
                .then((result) => {
                    expect(result).to.deep.equal(consentType);
                });
        };
    }

    listConsentTypesFn() {
        const self = this;
        return function listConsentTypes() {
            return self.listConsentTypesPx()
                .then((result) => {
                    const expected = self.hxConsentType.listServers();
                    expect(result).to.deep.equal(expected);
                });
        };
    }

    deleteConsentTypeFn(index) {
        const self = this;
        return function deleteConsentType() {
            const id = self.hxConsentType.id(index);
            return self.deleteConsentTypePx(id)
                .then(() => {
                    self.hxConsentType.remove(index);
                });
        };
    }

    getTranslatedConsentTypeFn(index, language) {
        const self = this;
        return function getTranslatedConsentType() {
            const id = self.hxConsentType.id(index);
            return self.getConsentTypePx(id, { language })
                .then((result) => {
                    const expected = self.hxConsentType.translatedServer(index, language);
                    expect(result).to.deep.equal(expected);
                });
        };
    }

    listTranslatedConsentTypesFn(language) {
        const self = this;
        return function listTranslatedConsentTypes() {
            return self.listConsentTypesPx({ language })
                .then((result) => {
                    const expected = self.hxConsentType.listTranslatedServers(language);
                    expect(result).to.deep.equal(expected);
                });
        };
    }

    translateConsentTypeFn(index, language) {
        const self = this;
        return function translateConsentType() {
            const server = self.hxConsentType.server(index);
            const translation = translator.translateConsentType(server, language);
            return self.translateConsentTypePx(translation, language)
                .then(() => {
                    self.hxConsentType.translate(index, language, translation);
                });
        };
    }
};

const SpecTests = class ConsentTypeSpecTests extends BaseTests {
    constructor(params) {
        super(params);
        this.models = models;
    }

    createConsentTypePx(consent) {
        return this.models.consentType.createConsentType(consent);
    }

    getConsentTypePx(id, options = {}) {
        return this.models.consentType.getConsentType(id, options);
    }

    listConsentTypesPx(options = {}) {
        return this.models.consentType.listConsentTypes(options);
    }

    deleteConsentTypePx(id) {
        return this.models.consentType.deleteConsentType(id);
    }

    translateConsentTypePx(translation, language) {
        return this.models.consentType.updateConsentTypeText(translation, language);
    }
};

const IntegrationTests = class ConsentTypeIntegrationTests extends BaseTests {
    constructor(rrSuperTest, params) {
        super(params);
        this.rrSuperTest = rrSuperTest;
    }

    createConsentTypePx(consentType) {
        return this.rrSuperTest.post('/consent-types', consentType, 201)
            .then(res => res.body);
    }

    getConsentTypePx(id, options = {}) {
        return this.rrSuperTest.get(`/consent-types/${id}`, true, 200, options)
            .then(res => res.body);
    }

    listConsentTypesPx(options = {}) {
        return this.rrSuperTest.get('/consent-types', true, 200, options)
            .then(res => res.body);
    }

    deleteConsentTypePx(id) {
        return this.rrSuperTest.delete(`/consent-types/${id}`, 204);
    }

    translateConsentTypePx(translation, language) {
        return this.rrSuperTest.patch(`/consent-types/text/${language}`, translation, 204);
    }
};

module.exports = {
    SpecTests,
    IntegrationTests,
};
