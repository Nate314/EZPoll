<template>
  <div class="home-view">
    <div class="card">
      <h1 class="card-title">EZPoll</h1>
      <p class="card-subtitle">Create a live poll and share it with your audience in seconds.</p>
      <button v-on:click="btnNewPoll">New Poll</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Home',
  methods: {
    btnNewPoll: function() {
      this.$router.push('/createquestion');
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.home-view {
  display: flex;
  justify-content: center;
}
.card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: var(--space-lg) var(--space-lg);
  width: 100%;
  max-width: 420px;
}
.card-title {
  margin-top: 0;
}
.card-subtitle {
  color: var(--color-text-muted);
  margin-bottom: var(--space-lg);
}
</style>
