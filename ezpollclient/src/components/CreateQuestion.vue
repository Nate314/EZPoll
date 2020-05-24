<template>
    <div>
        <div v-for="question in questionTypes" :key="question.QuestionGUID">
            <button v-on:click="questionSelected(question)">{{question.Description}}</button>
        </div>
    </div>
</template>

<script>
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
        if (session_guid) {
            fetch(`${localStorage.getItem('api_url')}/session/${session_guid}`, {
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'next',
                    user_guid: localStorage.getItem('user_guid'),
                    question_guid: question.QuestionGUID
                })
            }).then(x => x.json())
            .then(() => {
                this.$router.push('question');
            });
        } else {
            fetch(`${localStorage.getItem('api_url')}/session/new`, {
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_guid: localStorage.getItem('user_guid'),
                    question_guid: question.QuestionGUID
                })
            }).then(x => x.json())
            .then(response => {
                localStorage.setItem('session_guid', response.SessionGUID);
                this.$router.push('question');
            });
        }
      }
  },
  mounted() {
      fetch(`${localStorage.getItem('api_url')}/question/all`).then(x => x.json())
        .then(response => this.questionTypes = response);
  }
}
</script>

<style scoped>
</style>
