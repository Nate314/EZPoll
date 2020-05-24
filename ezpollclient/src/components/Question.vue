<template>
  <div>
    <h1 v-if="question">
        {{question.Description}} ?
    </h1>
    <div v-for="(answer, index) in answers" :key="answer.AnswerGUID">
        <button class="my-button" :class="{ 'btnselected': index == selected_index }"
          v-on:click="answerSelected(answer)">{{answer.Description}}</button>
    </div>
    <div v-if="info && info.answers_count">
      <h3>{{info.answers_count}} / {{info.participant_count}} participants have answered . . .</h3>
      <button v-if="info.enable_results_btn" v-on:click="showResults">Show Results</button>
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
      },
      showResults: function() {
        console.log('show results');
      }
  },
  mounted() {
    this.session_guid = localStorage.getItem('session_guid');
    fetch(`${localStorage.getItem('api_url')}/session/${this.session_guid}`).then(x => x.json())
      .then(session => fetch(`${localStorage.getItem('api_url')}/question/${session.QuestionGUID}`).then(x => x.json())
        .then(response => {
          this.question = response.question;
          this.answers = response.answers;
        }));
        console.log('a');
    setInterval(() => {
      if (this.answers && this.answers.length > 0) {
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
      }
      if (this.result_guid) {
        fetch(`${localStorage.getItem('api_url')}/result/${this.session_guid}_${localStorage.getItem('user_guid')}`).then(x => x.json())
          .then(stats => this.info = stats);
      }
    }, 1000);
  }
}
</script>

<style scoped>
.btnselected {
  background-color: #777777;
}
</style>
