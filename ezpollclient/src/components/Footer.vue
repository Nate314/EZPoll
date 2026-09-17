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
    setInterval(() => this.session_guid = sessionStorage.getItem('session_guid'), 100);
  }
}
</script>

<style scoped>
.left {
  text-align: left !important;
}
footer {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: var(--color-chrome-bg);
  backdrop-filter: blur(6px);
  border-top: 1px solid var(--color-border);
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.tooltip {
  position: relative;
  display: inline-block;
}

.tooltip .tooltiptext {
  visibility: hidden;
  width: 140px;
  background-color: #334155;
  color: #fff;
  text-align: center;
  border-radius: var(--radius-sm);
  padding: 6px 8px;
  position: absolute;
  z-index: 1;
  bottom: 150%;
  left: 50%;
  margin-left: -75px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.tooltip .tooltiptext::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -5px;
  border-width: 5px;
  border-style: solid;
  border-color: #334155 transparent transparent transparent;
}

.tooltip:hover .tooltiptext {
  visibility: visible;
  opacity: 1;
}

#invite-link {
  cursor: pointer;
  color: var(--color-primary-dark);
  font-weight: 600;
  text-decoration: underline dotted;
}
</style>
