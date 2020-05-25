<template>
  <div>
    <div>
      <button v-on:click="btnNewPoll">New Poll</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Home',
  methods: {
    btnNewPoll: function() {
      this.$router.push('createquestion');
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
