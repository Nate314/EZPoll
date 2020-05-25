<template>
    <div>
        <div v-for="question in questionTypes" :key="question.QuestionGUID">
            <button v-on:click="questionSelected(question)">{{question.Description}}</button>
        </div>
    </div>
</template>

<script>
import * as ezpollapi from '../services/ezpoll.service';

export default {
  name: 'CreateQuestion',
  data() {
      return {
          questionTypes: []
      }
  },
  methods: {
    questionSelected: function(question) {
        const session_guid = localStorage.getItem('session_guid');
        const user_guid = localStorage.getItem('user_guid');
        if (user_guid) {
            if (session_guid) {
                ezpollapi.postNextQuestion(session_guid, user_guid, question.QuestionGUID, () => {
                    this.$router.push('question');
                });
            } else {
                ezpollapi.postCreateSession(user_guid, question.QuestionGUID, response => {
                    localStorage.setItem('session_guid', response.SessionGUID);
                    this.$router.push('question');
                });
            }
        } else {
            this.$router.push('notfound');
        }
      }
  },
  mounted() {
      ezpollapi.getAllQuestions(response => this.questionTypes = response);
  }
}
</script>

<style scoped>
</style>
