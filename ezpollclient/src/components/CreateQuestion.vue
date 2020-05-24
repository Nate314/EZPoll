<template>
    <div>
        <div v-for="question in questionTypes" :key="question.QuestionGUID">
            <button>{{question.Description}}</button>
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
  mounted() {
      fetch(`${localStorage.getItem('api_url')}/question/all`).then(x => x.json())
        .then(response => this.questionTypes = response);
  }
}
</script>

<style scoped>
button {
    width: 400px;
    height: 50px;
    margin-bottom: 15px;
}
</style>
