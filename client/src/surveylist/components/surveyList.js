import React, {Component} from 'react';
import { Link } from 'react-router';

import SurveyListSection from './SurveySection';


export class SurveyList extends Component {

    constructor() {
        super();
    }

    render() {

        const surveys = this.props.surveys;

        console.log ("MESS EM UP HERE", surveys);

        return (
            <div className="row" id="surveyList">
                <div className="col-md-4 col-xs-12" id="sidebar">
                    <h1>Questionnaire</h1>
                    <h2>2/3 Completed</h2>
                </div>


                <div className="col-md-7 col-xs-12">
                    <ul>
                        <SurveyListSection
                            title="TO BE COMPLETED"
                            surveys={surveys}
                        />
                        <SurveyListSection
                            title="UPDATE NEEDED"
                            surveys={surveys}
                        />
                        <SurveyListSection
                            title="COMPLETED"
                            surveys={surveys}
                        />



                        
                        <section id="surveysToUpdate">
            <span className="label">
              Update Needed:
            </span>
                            <li>
                                <img />
                                <div className="flag"></div>
                                <span className="title">Test Survey for Updating</span>
                                <br/>
                                <p>Fusce ut massa eu dolor convallis eleifend ut sed eros. Duis enim nisi, efficitur eu
                                    elit sed, facilisis sodales ex. Nulla pulvinar, metus vitae luctus vulputate, sapien
                                    ex iaculis nisl, sed consequat erat lorem a felis. In nec fringilla ligula. Ut ut
                                    turpis eu nulla laoreet porttitor vel nec tellus. Sed sed laoreet nisl. Maecenas


                                    augue nunc, suscipit sed nulla non, mattis malesuada magna. Mauris quis dignissim
                                    nibh.</p>
              <span className="timeEstimate">
                <span><span className="label">Time Needed:<br/></span>30 Minutes</span>
              </span>
                                <Link to={'/surveyList/'}>Start Section</Link>
                            </li>
                        </section>
                        <section id="surveysCompleted">
            <span className="label">
              Completed:
            </span>
                            <li>
                                <img />
                                <div className="flag"></div>
                                <span className="title">Test Survey for Completed</span>
                                <br/>
                                <p>Fusce ut massa eu dolor convallis eleifend ut sed eros. Duis enim nisi, efficitur eu
                                    elit sed, facilisis sodales ex. Nulla pulvinar, metus vitae luctus vulputate, sapien
                                    ex iaculis nisl, sed consequat erat lorem a felis. In nec fringilla ligula. Ut ut
                                    turpis eu nulla laoreet porttitor vel nec tellus. Sed sed laoreet nisl. Maecenas
                                    augue nunc, suscipit sed nulla non, mattis malesuada magna. Mauris quis dignissim
                                    nibh.</p>
              <span className="timeEstimate">
                <span><span className="label">Time Needed:<br/></span>30 Minutes</span>
              </span>
                                <Link to={'/surveyList/'}>Start Section</Link>
                            </li>
                            <li>
                                <img />
                                <div className="flag"></div>
                                <span className="title">Test Survey for Completed</span>
                                <br/>
                                <p>Fusce ut massa eu dolor convallis eleifend ut sed eros. Duis enim nisi, efficitur eu
                                    elit sed, facilisis sodales ex. Nulla pulvinar, metus vitae luctus vulputate, sapien
                                    ex iaculis nisl, sed consequat erat lorem a felis. In nec fringilla ligula. Ut ut
                                    turpis eu nulla laoreet porttitor vel nec tellus. Sed sed laoreet nisl. Maecenas
                                    augue nunc, suscipit sed nulla non, mattis malesuada magna. Mauris quis dignissim
                                    nibh.</p>
              <span className="timeEstimate">
                <span><span className="label">Time Needed:<br/></span>30 Minutes</span>
              </span>
                                <Link to={'/surveyList/'}>Start Section</Link>
                            </li>
                        </section>
                    </ul>
                </div>
            </div>
        )
    }

    //
    // propTypes: {
    //
    //     }

}

export default SurveyList;