/* global describe,before,it*/

'use strict';

process.env.NODE_ENV = 'test';

const _ = require('lodash');
const chai = require('chai');

const SharedIntegration = require('./util/shared-integration.js');
const config = require('../config');
const RRSuperTest = require('./util/rr-super-test');
const Generator = require('./util/generator');
const comparator = require('./util/comparator');
const History = require('./util/history');
const questionCommon = require('./util/question-common');
const filterCommon = require('./util/filter-common');

const expect = chai.expect;

describe('cohort integration', function cohortIntegeration() {
    const rrSuperTest = new RRSuperTest();
    const generator = new Generator();
    const shared = new SharedIntegration(rrSuperTest, generator);
    const hxQuestion = new History();
    const hxCohort = new History();
    const qxTests = new questionCommon.IntegrationTests(rrSuperTest, { generator, hxQuestion });
    const filterTests = new filterCommon.IntegrationTests(rrSuperTest, hxQuestion);
    let cohortId = 1;

    before(shared.setUpFn());

    it('login as super', shared.loginFn(config.superUser));

    _.range(20).forEach((index) => {
        it(`create question ${index}`, qxTests.createQuestionFn());
        it(`get question ${index}`, qxTests.getQuestionFn(index));
    });

    const createCohortFn = function (filterIndex) {
        return function createCohort() {
            const filter = filterTests.hxFilter.server(filterIndex);
            const name = (filterIndex % 4) === 0 ? filter.name : `cohort_${cohortId}`;
            return rrSuperTest.post('/cohorts', { filterId: filter.id, name }, 201)
                .then(() => {
                    const client = { name };
                    hxCohort.push(client, { id: cohortId });
                    cohortId += 1;
                });
        };
    };

    const getCohortFn = function (index) {
        return function getCohort() {
            const id = hxCohort.id(index);
            return rrSuperTest.get(`/cohorts/${id}`, true, 200)
                .then((res) => {
                    const cohort = res.body;
                    hxCohort.updateServer(index, cohort);
                    comparator.cohort(hxCohort.client(index), cohort);
                });
        };
    };

    const patchCohortFn = function (index) { // does nothing currently, will send email
        return function patchCohort() {
            const id = hxCohort.id(index);
            return rrSuperTest.patch(`/cohorts/${id}`, {}, 200);
        };
    };

    _.range(10).forEach((index) => {
        it(`create filter ${index}`, filterTests.createFilterFn());
        it(`get filter ${index}`, filterTests.getFilterFn(index));
        if (index % 2 === 0) {
            it(`create cohort ${index / 2}`, createCohortFn(index));
            it(`get cohort ${index / 2}`, getCohortFn(index / 2));
            it(`patch cohort ${index / 2}`, patchCohortFn(index / 2));
        }
    });

    const listCohortsFn = function (count) {
        return function listCohorts() {
            return rrSuperTest.get('/cohorts', true, 200)
                .then((res) => {
                    const cohorts = res.body;
                    expect(cohorts.length).to.equal(count);
                    const fields = ['id', 'name', 'createdAt'];
                    const expected = _.cloneDeep(hxCohort.listServers(fields));
                    expect(cohorts).to.deep.equal(expected);
                });
        };
    };

    const deleteCohortFn = function (index) {
        return function deleteFilter() {
            const id = hxCohort.id(index);
            return rrSuperTest.delete(`/cohorts/${id}`, 204)
                .then(() => hxCohort.remove(index));
        };
    };

    it('list cohorts', listCohortsFn(5));

    it('delete cohort 2', deleteCohortFn(2));

    it('list cohorts', listCohortsFn(4));

    it('logout as user', shared.logoutFn());
});
