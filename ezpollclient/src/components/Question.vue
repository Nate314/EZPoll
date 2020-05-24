<template>
  <div>
    <h1>
        {{question.Description}} ?
    </h1>
    <div v-for="answer in answers" :key="answer.AnswerGUID">
        <button class="my-button" v-bind:class="{ 'btn-selected': !!answer.Chosen }"
          v-on:click="answerSelected(answer)">{{answer.Description}}</button>
    </div>
    <button>Submit</button>
    <h1>
        5 / 7 participants have answered . . .
    </h1>
  </div>
</template>

<script>
export default {
  name: 'Question',
  data() {
    return {
      session_guid: '',
      question: {},
      answers: []
    };
  },
  methods: {
      answerSelected: function(answer) {
        this.answers.forEach(x => x['Chosen'] = x.AnswerGUID === answer.AnswerGUID)
        console.log(JSON.stringify(this.answers));
      }
  },
  mounted() {
    console.log(this.$route);
    this.session_guid = this.$route.params.session_guid;
    fetch(`${localStorage.getItem('api_url')}/session/${this.session_guid}`).then(x => x.json())
      .then(session => fetch(`${localStorage.getItem('api_url')}/question/${session.QuestionGUID}`).then(x => x.json())
        .then(response => {
          this.question = response.question;
          this.answers = response.answers;
        }));
  }
}
</script>

<style scoped>
.my-button {
    width: 400px;
    height: 50px;
    margin-bottom: 15px;
}
.btn-selected {
  background-color: #444444
}
</style>
