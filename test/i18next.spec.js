/* global describe,it */

'use strict';

process.env.NODE_ENV = 'test';

const i18n = require('../i18n');

const chai = require('chai');

const expect = chai.expect;

describe('i18next unit', function i18NextUnit() {
    it('get default (en) key value', function defaultKey() {
        const value = i18n.t('test');
        expect(value).to.equal('Testing.');
    });

    it('get default (en) key value with 1 param', function defaultKey1Param() {
        const value = i18n.t('testParams1', { $0: 'param0' });
        expect(value).to.equal('Testing param0.');
    });

    it('get default (en) key value with 2 params', function defaultKey2Params() {
        const value = i18n.t('testParams2', { $0: 'param0', $1: 'param1' });
        expect(value).to.equal('Testing param1 and param0 and param1.');
    });

    it('get default (en) invalid key value', function defaultInvalidKey() {
        const value = i18n.t(['invalidKey', 'unknown']);
        expect(value).to.equal('Internal unknown error.');
    });

    it('switch to spanish', function changeLanguageToSpanish() {
        return i18n.changeLanguage('es');
    });

    it('get spanish (es) key value', function spanishKey() {
        const value = i18n.t('test');
        expect(value).to.equal('Pruebas.');
    });

    it('get spanish (es) key value with 1 param', function spanishKey1Param() {
        const value = i18n.t('testParams1', { $0: 'param0' });
        expect(value).to.equal('Pruebas param0.');
    });

    it('get spanish (es) key value with 2 params', function spanishKey2Params() {
        const value = i18n.t('testParams2', { $0: 'param0', $1: 'param1' });
        expect(value).to.equal('Pruebas param1 y param0 y param1.');
    });

    it('get spanish (es) invalid key value', function spanishInvalidKey() {
        const value = i18n.t(['invalidKey', 'unknown']);
        expect(value).to.equal('Error interno desconocido.');
    });

    it('switch to english', function changeLanguageToEnglish() {
        return i18n.changeLanguage('en');
    });

    it('get english (en) key value', function englishKey() {
        const value = i18n.t('test');
        expect(value).to.equal('Testing.');
    });

    it('get english (en) key value with 1 param', function englishKey1Param() {
        const value = i18n.t('testParams1', { $0: 'param0' });
        expect(value).to.equal('Testing param0.');
    });

    it('get english (en) key value with 2 params', function englishKey2Params() {
        const value = i18n.t('testParams2', { $0: 'param0', $1: 'param1' });
        expect(value).to.equal('Testing param1 and param0 and param1.');
    });

    it('get english (en) invalid key value', function englishInvalidKey() {
        const value = i18n.t(['invalidKey', 'unknown']);
        expect(value).to.equal('Internal unknown error.');
    });
});
