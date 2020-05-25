<template>
  <footer v-if="session_guid">
    <div class="left">
      <span>Invite Link: </span>
      <span class="tooltip">
        <span id="invite-link" v-on:click="copyLink">{{getInviteLink()}}</span>
        <span class="tooltiptext" id="myTooltip">Copy to clipboard</span>
      </span>
    </div>
  </footer>
</template>

<script>
export default {
  name: 'Footer',
  data() {
    return {
      session_guid: ''
    }
  },
  methods: {
    getInviteLink() {
      return `${window.origin}/${this.session_guid}`;
    },
    copyLink() {
      const textArea = document.createElement('textarea');
      textArea.value = this.getInviteLink();
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
    }
  },
  mounted() {
    setInterval(() => this.session_guid = localStorage.getItem('session_guid'), 100);
  }
}
</script>

<style scoped>
.left {
  text-align: left !important;
}
footer {
  position: absolute;
  bottom: 0;
}

.tooltip {
  position: relative;
  display: inline-block;
}

.tooltip .tooltiptext {
  visibility: hidden;
  width: 140px;
  background-color: #555;
  color: #fff;
  text-align: center;
  border-radius: 6px;
  padding: 5px;
  position: absolute;
  z-index: 1;
  bottom: 150%;
  left: 50%;
  margin-left: -75px;
  opacity: 0;
  transition: opacity 0.3s;
}

.tooltip .tooltiptext::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -5px;
  border-width: 5px;
  border-style: solid;
  border-color: #555 transparent transparent transparent;
}

.tooltip:hover .tooltiptext {
  visibility: visible;
  opacity: 1;
}

#invite-link {
  cursor: pointer;
}
</style>
