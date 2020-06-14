<template>
  <div>
    <h1 v-if="question">
        {{question.Description}} ?
    </h1>
    <div v-if="!(info && info.results)">
      <div v-for="(answer, index) in answers" :key="answer.AnswerGUID">
        <button class="my-button" :class="{ 'btnselected': index == selected_index }"
          v-on:click="answerSelected(answer)">{{answer.Description}}</button>
      </div>
    </div>
    <div v-if="info && info.participant_count">
      <h3>{{info.answers_count}} / {{info.participant_count}} participants have answered . . .</h3>
      <button v-if="enable_host_btns" v-on:click="showResults">Show Results</button>
    </div>
    <div v-if="info && info.results">
      <div v-for="(result, index) in info.results" :key="result.AnswerGUID">
        <button class="my-button" :class="{ 'btnselected': index == selected_index }">
          {{result.Description}}
        </button>
        <div>
          <progress :value="100 * result.AnswerCount / info.responses" max="100" style="width:300px;"></progress>
          <div>{{Math.round(100 * result.AnswerCount / info.responses)}}% ({{result.AnswerCount}}/{{info.responses}})</div>
        </div>
      </div>
      <button v-if="enable_host_btns" v-on:click="nextQuestion">NextQuestion</button>
    </div>
  </div>
</template>

<script>
import * as ezpollapi from '../services/ezpoll.service';

export default {
  name: 'Question',
  data() {
    return {
      session_guid: '',
      enable_host_btns: false,
      question: null,
      answers: [],
      selected_index: null,
      result_guid: null,
      info: null
    };
  },
  methods: {
    answerSelected: function(answer) {
      this.answers.forEach((x, i) => {
        x['Chosen'] = false;
        if (x.AnswerGUID === answer.AnswerGUID) {
          x['Chosen'] = true;
          this.selected_index = i;
        }
      });
      ezpollapi.postResult(this.session_guid, localStorage.getItem('user_guid'),
        this.selected_index == null ? null : this.answers[this.selected_index].AnswerGUID,
        this.result_guid, response => {
          this.result_guid = response;
      });
    },
    showResults: function() {
      ezpollapi.postShowResults(this.session_guid, localStorage.getItem('user_guid'), this.question.QuestionGUID);
    },
    nextQuestion: function() {
      this.$router.push('createquestion');
    },
    getQuestion: function(question_guid) {
      return new Promise(resolve => {
        ezpollapi.getQuestion(question_guid, response => {
          this.selected_index = null;
          this.result_guid = null;
          this.question = response.question;
          this.answers = response.answers;
          this.answerSelected({});
          resolve();
        });
      });
    }
  },
  created() {
    const user_guid = localStorage.getItem('user_guid');
    this.session_guid = localStorage.getItem('session_guid');
    if (this.session_guid) {
      ezpollapi.getSession(this.session_guid, session => {
        this.enable_host_btns = session.HostGUID === user_guid;
        this.getQuestion(session.QuestionGUID).then(() => undefined);
      });
      ezpollapi.getResultStats(stats => {
        console.log('stats', stats);
        const isQuestionReset = this.info && this.info.results && stats && !stats.results;
        const isNewQuestion = stats.question_guid !== this.question.QuestionGUID;
        this.info = stats;
        if (isQuestionReset || isNewQuestion) {
          this.getQuestion(stats.question_guid).then(() => undefined);
        }
        if (this.info.results) {
          const inforesults = JSON.parse(JSON.stringify(this.info.results));
          const answers = JSON.parse(JSON.stringify(this.answers));
          this.info.results = answers.map(answer => {
            const inforesultsanswer = inforesults.find(x => x.AnswerGUID === answer.AnswerGUID);
            answer.AnswerCount = inforesultsanswer ? inforesultsanswer.AnswerCount : 0;
            return answer;
          });
        }
      });
    } else {
      this.$router.push('notfound');
    }
  }
}
</script>

<style scoped>
.btnselected {
  background-color: #AAAAAA;
}
</style>
