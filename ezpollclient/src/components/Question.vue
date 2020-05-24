<template>
  <div>
    <h1>
        Question?
    </h1>
    <h1>
        Answer1
    </h1>
    <h1>
        Answer2
    </h1>
    <h1>
        Answer3
    </h1>
    <button>Submit</button>
    <h1>
        5 / 7 participants have answered . . .
    </h1>
    <h1>{{session_id}}</h1>
  </div>
</template>


<script>
export default {
  name: 'Question',
  data() {
    return {
      session_id: ''
    };
  },
  methods: {
      loading() {
          
      }
  },
  mounted() {
      console.log(this.$route);
      this.session_id = this.$route.params.user_id;
  }
}
</script>

<style scoped>
</style>
