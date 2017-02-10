'use strict';

module.exports = {
    name: 'Sleep',
    identifier: {
        type: 'bhr-gap',
        value: 'sleep'
    },
    sections: [{
        name: 'dummy',
        questions: [{
            text: 'During the past month, when have you usually gone to bed at night?',
            required: false,
            type: 'choice-ref',
            answerIdentifier: { type: 'bhr-gap-sleep-column', value: 'QID141' },
            enumeration: 'sleep-time'
        }, {
            text: 'During the past month, how long (in minutes) has it usually taken you to fall asleep each night?',
            required: true,
            type: 'choice-ref',
            answerIdentifier: { type: 'bhr-gap-sleep-column', value: 'QID142' },
            enumeration: 'duration-5-minutes'
        }, {
            text: 'During the past month, when have you usually gotten up in the morning?',
            required: true,
            type: 'choice-ref',
            answerIdentifier: { type: 'bhr-gap-sleep-column', value: 'QID143' },
            enumeration: 'wakeup-time'
        }, {
            text: 'During the past month, how many hours of actual sleep did you get at night? (This may be different than the number of hours you spend in bed.)',
            required: true,
            type: 'choice-ref',
            answerIdentifier: { type: 'bhr-gap-sleep-column', value: 'QID94' },
            enumeration: 'amount-3-12-.5'
        }]
    }, {
        name: 'During the past month, how often have you had trouble sleeping because you...',
        questions: [{
            type: 'choice-ref',
            enumeration: 'frequency-weekly',
            required: false,
            answerIdentifier: { type: 'bhr-gap-sleep-column', value: 'QID95_1' },
            text: 'Cannot get to sleep within 30 minutes',
        }, {
            type: 'choice-ref',
            enumeration: 'frequency-weekly',
            required: false,
            answerIdentifier: { type: 'bhr-gap-sleep-column', value: 'QID95_2' },
            text: 'Wake up in the middle of the night or early morning',
        }, {
            type: 'choice-ref',
            enumeration: 'frequency-weekly',
            required: false,
            answerIdentifier: { type: 'bhr-gap-sleep-column', value: 'QID95_3' },
            text: 'Have to get up to use the bathroom',
        }, {
            type: 'choice-ref',
            enumeration: 'frequency-weekly',
            required: false,
            answerIdentifier: { type: 'bhr-gap-sleep-column', value: 'QID95_4' },
            text: 'Cannot breathe comfortably',
        }, {
            type: 'choice-ref',
            enumeration: 'frequency-weekly',
            required: false,
            answerIdentifier: { type: 'bhr-gap-sleep-column', value: 'QID95_5' },
            text: 'Cough or snore loudly',
        }, {
            type: 'choice-ref',
            enumeration: 'frequency-weekly',
            required: false,
            answerIdentifier: { type: 'bhr-gap-sleep-column', value: 'QID95_6' },
            text: 'Feel too cold',
        }, {
            type: 'choice-ref',
            enumeration: 'frequency-weekly',
            required: false,
            answerIdentifier: { type: 'bhr-gap-sleep-column', value: 'QID95_7' },
            text: 'Feel too hot',
        }, {
            type: 'choice-ref',
            enumeration: 'frequency-weekly',
            required: false,
            answerIdentifier: { type: 'bhr-gap-sleep-column', value: 'QID95_8' },
            text: 'Had bad dreams',
        }, {
            type: 'choice-ref',
            enumeration: 'frequency-weekly',
            required: false,
            answerIdentifier: { type: 'bhr-gap-sleep-column', value: 'QID95_9' },
            text: 'Have pain',
        }, {
            type: 'choice-ref',
            enumeration: 'frequency-weekly',
            required: false,
            answerIdentifier: { type: 'bhr-gap-sleep-column', value: 'QID95_10' },
            text: 'Other reason(s), please describe',
        }, {
            text: 'If other reason, please describe',
            type: 'text',
            required: false,
            answerIdentifier: { type: 'bhr-gap-sleep-column', value: 'QID95_10_TEXT' }
        }]
    }, {
        name: 'dummy',
        questions: [{
            text: 'During the past month, how would you rate your sleep quality overall?',
            type: 'choice-ref',
            required: false,
            answerIdentifier: { type: 'bhr-gap-sleep-column', value: 'QID96' },
            enumeration: 'condition-4'
        }, {
            text: 'During the past month, how often have you taken medicine (prescribed or "over the counter") to help you sleep?',
            type: 'choice-ref',
            required: false,
            answerIdentifier: { type: 'bhr-gap-sleep-column', value: 'QID97' },
            enumeration: 'frequency-weekly'
        }, {
            text: 'During the past month, how often have you had trouble staying awake while driving, eating meals, or engaging in social activity?',
            type: 'choice-ref',
            required: false,
            answerIdentifier: { type: 'bhr-gap-sleep-column', value: 'QID98' },
            enumeration: 'frequency-weekly'
        }, {
            text: 'During the past month, how much of a problem has it been for you to keep up enough enthusiasm to get things done?',
            type: 'choice-ref',
            required: false,
            answerIdentifier: { type: 'bhr-gap-sleep-column', value: 'QID145' },
            enumeration: 'is-problem'
        }, {
            text: 'Do you have a bed partner or roommate?',
            type: 'choice-ref',
            required: false,
            answerIdentifier: { type: 'bhr-gap-sleep-column', value: 'QID146' },
            enumeration: 'bed-partner'
        }]
    }, {
        name: 'If you have a roommate or bed partner, ask him/her how often in the past month you have had...',
        questions: [{
            type: 'choice-ref',
            enumeration: 'frequency-weekly',
            required: false,
            answerIdentifier: { type: 'bhr-gap-sleep-column', value: 'QID101_1' },
            text: 'Loud snoring',
        }, {
            type: 'choice-ref',
            enumeration: 'frequency-weekly',
            required: false,
            answerIdentifier: { type: 'bhr-gap-sleep-column', value: 'QID101_2' },
            text: 'Long pauses between breaths while asleep',
        }, {
            type: 'choice-ref',
            enumeration: 'frequency-weekly',
            required: false,
            answerIdentifier: { type: 'bhr-gap-sleep-column', value: 'QID101_3' },
            text: 'Legs twitching or jerking while you sleep',
        }, {
            type: 'choice-ref',
            enumeration: 'frequency-weekly',
            required: false,
            answerIdentifier: { type: 'bhr-gap-sleep-column', value: 'QID101_4' },
            text: 'Other restlessness while you sleep; please describe',
        }, {
            type: 'choice-ref',
            enumeration: 'frequency-weekly',
            required: false,
            answerIdentifier: { type: 'bhr-gap-sleep-column', value: 'QID101_5' },
            text: 'Other restlessness while you sleep',
        }]
    }, {
        name: 'dummy',
        questions: [{
            text: 'If other reason, please describe',
            type: 'text',
            required: false,
            answerIdentifier: { type: 'bhr-gap-sleep-column', value: 'QID101_5_TEXT' }
        }, {
            text: 'How many hours do you spend napping in a typical day?',
            required: false,
            type: 'choice-ref',
            answerIdentifier: { type: 'bhr-gap-sleep-column', value: 'QID196' },
            enumeration: 'duration-hour'
        }, {
            text: 'I feel sleepy during the day and struggle to remain alert.',
            required: false,
            type: 'choice-ref',
            answerIdentifier: { type: 'bhr-gap-sleep-column', value: 'QID197' },
            enumeration: 'much-to-none'
        }]
    }]
};
