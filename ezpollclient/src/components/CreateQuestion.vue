<template>
    <div class="create-question-view">
        <div class="card">
            <h1 class="card-title">Choose a Question Type</h1>
            <div class="option-list">
                <div v-for="question in questionTypes" :key="question.QuestionGUID">
                    <button v-on:click="questionSelected(question)">{{question.Description}}</button>
                </div>
            </div>
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
        const session_guid = sessionStorage.getItem('session_guid');
        const user_guid = sessionStorage.getItem('user_guid');
        if (user_guid) {
            if (session_guid) {
                ezpollapi.postNextQuestion(session_guid, user_guid, question.QuestionGUID, () => {
                    this.$router.push('/question');
                });
            } else {
                ezpollapi.postCreateSession(user_guid, question.QuestionGUID, response => {
                    sessionStorage.setItem('session_guid', response.SessionGUID);
                    this.$router.push('/question');
                });
            }
        } else {
            this.$router.push('/notfound');
        }
      }
  },
  mounted() {
      ezpollapi.getAllQuestions(response => this.questionTypes = response);
  }
}
</script>

<style scoped>
.create-question-view {
  display: flex;
  justify-content: center;
}
.card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: var(--space-lg);
  width: 100%;
  max-width: 480px;
}
.card-title {
  margin-top: 0;
}
.option-list {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
