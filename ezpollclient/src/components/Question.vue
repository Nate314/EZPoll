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
      <button v-if="info.enable_host_btns" v-on:click="showResults">Show Results</button>
    </div>
    <div v-if="info && info.results">
      <div v-for="result in info.results" :key="result.AnswerGUID">
        <button>
          {{result.Description}}
        </button>
        <div>
          <progress :value="100 * result.AnswerCount / info.responses" max="100" style="width:300px;"></progress>
          <div>{{Math.round(100 * result.AnswerCount / info.responses)}}% ({{result.AnswerCount}}/{{info.responses}})</div>
        </div>
      </div>
      <button v-if="info.enable_host_btns" v-on:click="nextQuestion">NextQuestion</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Question',
  data() {
    return {
      session_guid: '',
      question: null,
      answers: [],
      selected_index: null,
      result_guid: null,
      info: null,
      interval: null
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
      fetch(`${localStorage.getItem('api_url')}/result/${localStorage.getItem('session_guid')}`, {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_guid: localStorage.getItem('user_guid'),
          answer_guid: this.selected_index == null ? null : this.answers[this.selected_index].AnswerGUID,
          result_guid: this.result_guid
        })
      }).then(x => x.json())
      .then(response => {
          this.result_guid = response;
      });
    },
    showResults: function() {
      fetch(`${localStorage.getItem('api_url')}/session/${localStorage.getItem('session_guid')}`, {
          method: 'post',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              user_guid: localStorage.getItem('user_guid'),
              question_guid: this.question.QuestionGUID,
              action: 'reveal'
          })
      }).then(x => x.json());
    },
    nextQuestion: function() {
      this.$router.push('createquestion');
    },
    getQuestion: function(question_guid) {
      return fetch(`${localStorage.getItem('api_url')}/question/${question_guid}`).then(x => x.json())
        .then(response => {
          this.selected_index = null;
          this.result_guid = null;
          this.question = response.question;
          this.answers = response.answers;
          this.answerSelected({});
        });
    }
  },
  mounted() {
    this.session_guid = localStorage.getItem('session_guid');
    if (this.session_guid) {
      fetch(`${localStorage.getItem('api_url')}/session/${this.session_guid}`).then(x => x.json())
        .then(session => {
          this.getQuestion(session.QuestionGUID).then(() => {
            this.interval = setInterval(() => {
              fetch(`${localStorage.getItem('api_url')}/result/${this.session_guid}_${localStorage.getItem('user_guid')}`).then(x => x.json())
                .then(stats => {
                  const isQuestionReset = this.info && this.info.results && stats && !stats.results;
                  const isNewQuestion = stats.question_guid !== this.question.QuestionGUID;
                  this.info = stats;
                  if (isQuestionReset || isNewQuestion) {
                    this.getQuestion(stats.question_guid);
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
            }, 2000);
          });
        });
    } else {
      this.$router.push('notfound');
    }
  },
  beforeDestroy() {
    clearInterval(this.interval);
  }
}
</script>

<style scoped>
.btnselected {
  background-color: #AAAAAA;
}
</style>
