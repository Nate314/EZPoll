<template>
  <div class="question-view">
    <div class="card">
      <h1 v-if="question">
          {{question.Description}} ?
      </h1>
      <div class="option-list" v-if="!(info && info.results)">
        <div v-for="(answer, index) in answers" :key="answer.AnswerGUID">
          <button class="my-button" :class="{ 'btnselected': index == selected_index }"
            v-on:click="answerSelected(answer)">{{answer.Description}}</button>
        </div>
      </div>
      <div class="status-block" v-if="info && info.participant_count">
        <h3>{{info.answers_count}} / {{info.participant_count}} participants have answered . . .</h3>
        <button v-if="enable_host_btns" v-on:click="showResults">Show Results</button>
      </div>
      <div class="results-block" v-if="info && info.results">
        <div class="result-row" v-for="(result, index) in info.results" :key="result.AnswerGUID">
          <button class="my-button" :class="{ 'btnselected': index == selected_index }">
            {{result.Description}}
          </button>
          <div class="result-meta">
            <progress :value="percentOf(result.AnswerCount)" max="100"></progress>
            <div class="result-percent">{{Math.round(percentOf(result.AnswerCount))}}% ({{result.AnswerCount}}/{{info.responses}})</div>
          </div>
        </div>
        <button v-if="enable_host_btns" v-on:click="nextQuestion">NextQuestion</button>
      </div>
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
    // A question with no responses has info.responses === 0, and 0 / 0 is NaN.
    percentOf: function(count) {
      return this.info && this.info.responses > 0 ? 100 * count / this.info.responses : 0;
    },
    answerSelected: function(answer) {
      this.answers.forEach((x, i) => {
        x['Chosen'] = false;
        if (x.AnswerGUID === answer.AnswerGUID) {
          x['Chosen'] = true;
          this.selected_index = i;
        }
      });
      ezpollapi.postResult(this.session_guid, sessionStorage.getItem('user_guid'),
        this.selected_index == null ? null : this.answers[this.selected_index].AnswerGUID,
        this.result_guid, response => {
          this.result_guid = response;
      });
    },
    showResults: function() {
      ezpollapi.postShowResults(this.session_guid, sessionStorage.getItem('user_guid'), this.question.QuestionGUID);
    },
    nextQuestion: function() {
      this.$router.push('/createquestion');
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
    const user_guid = sessionStorage.getItem('user_guid');
    this.session_guid = sessionStorage.getItem('session_guid');
    if (this.session_guid) {
      ezpollapi.getSession(this.session_guid, session => {
        this.enable_host_btns = session.HostGUID === user_guid;
        this.getQuestion(session.QuestionGUID).then(() => undefined);
      });
      ezpollapi.getResultStats(stats => {
        console.log('stats', stats);
        const isQuestionReset = this.info && this.info.results && stats && !stats.results;
        const isNewQuestion = !this.question || stats.question_guid !== this.question.QuestionGUID;
        this.info = stats;
        if (stats && stats.question_guid && (isQuestionReset || isNewQuestion)) {
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
      this.$router.push('/notfound');
    }
  }
}
</script>

<style scoped>
.question-view {
  display: flex;
  justify-content: center;
}
.card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: var(--space-lg);
  width: 100%;
  max-width: 520px;
}
.option-list {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.status-block {
  margin-top: var(--space-md);
}
.results-block {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.result-row {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}
.result-meta {
  margin-bottom: var(--space-sm);
}
.result-percent {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  margin-top: 4px;
}
progress {
  width: 100%;
  max-width: 400px;
  height: 12px;
  border-radius: 6px;
  overflow: hidden;
  appearance: none;
  border: none;
  background: var(--color-border);
}
progress::-webkit-progress-bar {
  background: var(--color-border);
  border-radius: 6px;
}
progress::-webkit-progress-value {
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
  border-radius: 6px;
}
progress::-moz-progress-bar {
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
  border-radius: 6px;
}
.btnselected {
  background: linear-gradient(135deg, var(--color-accent), var(--color-primary-dark));
}
</style>
