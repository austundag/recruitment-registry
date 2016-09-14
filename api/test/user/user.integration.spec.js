/* global describe,before,after,beforeEach,afterEach,it,xit*/
'use strict';
process.env.NODE_ENV = 'test';

var chai = require('chai');
var _ = require('lodash');

const appgen = require('../../app-generator');

const models = require('../../models');
const userExamples = require('../fixtures/user-examples');

const config = require('../../config');
const shared = require('../shared.integration');

const request = require('supertest');

const expect = chai.expect;

const User = models.User;
const Ethnicity = models.Ethnicity;

describe('user integration', function () {
    const user = userExamples.Example;
    const store = {
        server: null,
        auth: null
    };

    before(function (done) {
        appgen.generate(function (err, app) {
            if (err) {
                return done(err);
            }
            store.server = request(app);
            done();
        });
    });

    var ethnicities;
    var genders;

    it('invalid path', function (done) {
        store.server
            .get('/xxxxxxx')
            .expect(404)
            .end(done);
    });

    it('get available ethnicities', function (done) {
        store.server
            .get('/api/v1.0/ethnicities')
            .expect(200)
            .expect(function (res) {
                var expected = Ethnicity.ethnicities();
                expect(res.body).to.deep.equal(expected);
            })
            .end(done);
    });

    it('get available genders', function (done) {
        store.server
            .get('/api/v1.0/genders')
            .expect(200)
            .expect(function (res) {
                var expected = User.genders();
                expect(res.body).to.deep.equal(expected);
            })
            .end(done);
    });

    it('no user authentication error', function (done) {
        store.server
            .get('/api/v1.0/users/me')
            .expect(401, done);
    });

    it('login default user', shared.loginFn(store, config.initialUser));

    it('wrong authorization error', function (done) {
        store.server
            .get('/api/v1.0/users/me')
            .set('Authorization', 'Bearer ' + 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidXNlcm5hbWUiOiJ1ZXN0Iiwicm9sZSI6bnVsbCwiaWF0IjoxNDczNTAwNzE5LCJleHAiOjE0NzYwOTI3MTl9.e0ymr0xrDPuQEBmdQLjb5-WegNtYcqAcpKp_DtDRKo8')
            .expect(401, done);
    });

    it('get default user', function (done) {
        store.server
            .get('/api/v1.0/users/me')
            .set('Authorization', store.auth)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                var user = res.body;
                expect(!user).to.equal(false);
                expect(user.username).to.equal(config.initialUser.username);
                expect(user.role).to.equal('admin');
                done();
            });
    });

    it('create a new user', function (done) {
        store.server
            .post('/api/v1.0/users')
            .set('Authorization', store.auth)
            .send(user)
            .expect(201, done);
    });

    it('login with the new user', shared.loginFn(store, user));

    it('get the new user', function (done) {
        store.server
            .get('/api/v1.0/users/me')
            .set('Authorization', store.auth)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                delete res.body.id;
                var expectedUser = _.cloneDeep(user);
                expectedUser.role = 'participant';
                delete expectedUser.password;
                expect(res.body).to.deep.equal(expectedUser);
                done();
            });
    });

    it('login default user', shared.loginFn(store, config.initialUser));

    it('handle database error (invalid email)', function (done) {
        const userEmailErr = _.cloneDeep(user);
        userEmailErr.email = 'notanemail';
        userEmailErr.username = user.username + '1';
        store.server
            .post('/api/v1.0/users')
            .set('Authorization', store.auth)
            .send(userEmailErr)
            .expect(400)
            .end(done);
    });

    it('create the new user again to err', function (done) {
        store.server
            .post('/api/v1.0/users')
            .set('Authorization', store.auth)
            .send(user)
            .expect(400)
            .end(done);
    });

    it('send down null items', function (done) {
        const userWithNulls = _.cloneDeep(user);
        userWithNulls.email = null;
        userWithNulls.gender = null;
        userWithNulls.username = user.username + '1';
        store.server
            .post('/api/v1.0/users')
            .set('Authorization', store.auth)
            .send(userWithNulls)
            .expect(201)
            .end(done);
    });
});
