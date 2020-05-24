<template>
  <div>
    <div>
      <button v-on:click="btnNewPoll">New Poll</button>
    </div>
    <div>
      <button v-on:click="btnJoinPoll">Join Poll</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Home',
  methods: {
    btnNewPoll: function() {
      
    },
    btnJoinPoll: function() {
    }
  },
  mounted() {
    const user_guid = localStorage.getItem('user_guid');
    if (user_guid) {
      fetch(`${localStorage.getItem('api_url')}/user/${user_guid}`).then(x => x.json())
        .then(response => console.log(response));
    } else {
      fetch(`${localStorage.getItem('api_url')}/user/new`).then(x => x.json())
        .then(response => localStorage.setItem('user_guid', response.UserGUID));
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
button {
    width: 400px;
    height: 50px;
    margin-bottom: 15px;
}
</style>
