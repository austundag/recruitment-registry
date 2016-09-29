/* global describe,it*/
'use strict';
process.env.NODE_ENV = 'test';

const chai = require('chai');

const RRError = require('../lib/rr-error');

const expect = chai.expect;

describe('rr-error unit', function () {
    it('text only', function () {
        const err = new RRError('test');
        expect(err.message).to.equal('Testing.');
        expect(err).to.be.instanceof(RRError);
        expect(err).to.be.instanceof(Error);
        expect(err.code).to.equal('test');
    });

    it('1 param', function () {
        const err = new RRError('testParams1', 'param');
        expect(err.message).to.equal('Testing param.');
        expect(err).to.be.instanceof(RRError);
        expect(err).to.be.instanceof(Error);
        expect(err.code).to.equal('testParams1');
    });

    it('2 params', function () {
        const err = new RRError('testParams2', 'a', 'b');
        expect(err.message).to.equal('Testing b and a and b.');
        expect(err).to.be.instanceof(RRError);
        expect(err).to.be.instanceof(Error);
        expect(err.code).to.equal('testParams2');
    });

    it('unknown', function () {
        const err = new RRError('not-existing', 'a', 'b');
        expect(err).to.be.instanceof(RRError);
        expect(err).to.be.instanceof(Error);
        expect(err.code).to.equal('unknown');
    });

    it('reject', function () {
        return RRError.reject('test')
            .then(() => { throw new Error('unexpected no error'); })
            .catch(err => {
                expect(err.message).to.equal('Testing.');
                expect(err).to.be.instanceof(RRError);
                expect(err).to.be.instanceof(Error);
                expect(err.code).to.equal('test');
            });
    });

    it('message for unknown', function () {
        expect(RRError.message('not-existing')).to.equal(RRError.message('unknown'));
    });
});