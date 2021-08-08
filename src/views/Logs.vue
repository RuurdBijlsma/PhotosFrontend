<template>
    <div class="logs"
         :style="{maxHeight: `calc(100vh - ${$vuetify.application.top + $vuetify.application.bottom}px)`}">
        <h3 class="mt-6 mb-6 text-center">Logs</h3>
        <v-divider/>

        <div class="log-content"
             @wheel="userScroll"
             ref="logContent"
             :style="{maxHeight: `calc(100vh - ${$vuetify.application.top + $vuetify.application.bottom + 80}px)`}">
            <v-sheet class="row" v-for="log in logs" :key="log.id">
                <v-icon :color="logColor(log.type)" class="icon">{{ logIcon(log.type) }}</v-icon>
                <span class="date">{{ formatDate(log.createdAt, 'HH:mm:ss.SS') }}</span>
                <v-chip :color="stringToColor(log.tag)" class="tag">{{ log.tag }}</v-chip>
                <span class="message">{{ log.message }}</span>
            </v-sheet>
            <v-btn class="scroll-button" @click="userScrollDown" color="primary" rounded v-if="userScrolled">
                Scroll down
            </v-btn>
        </div>
    </div>
</template>

<script lang="ts">
import {api} from "@/ts/constants";
import Vue from "vue";
import {format} from "date-fns";

export default Vue.extend({
    name: "Logs",
    data: () => ({
        api,
        logs: [],
        updateInterval: -1,
        userScrolled: false,
    }),
    beforeDestroy() {
        clearInterval(this.updateInterval);
    },
    async mounted() {
        await this.updateLogs(false);
        this.updateInterval = setInterval(() => {
            this.updateLogs();
        }, 1000);
        console.log(this.logs)
    },
    methods: {
        formatDate(dateString: string, f: string) {
            return format(new Date(dateString), f);
        },
        userScrollDown() {
            this.scrollDown();
            this.userScrolled = false;
        },
        scrollDown(smooth = false) {
            let logContent = this.$refs.logContent as HTMLElement;
            logContent.scrollTo({top: logContent.scrollHeight, behavior: smooth ? "smooth" : "auto"});
        },
        userScroll() {
            console.log('user scrolled');
            this.userScrolled = true;
        },
        async updateLogs(smooth = true) {
            this.logs = await this.$store.dispatch('apiRequest', {url: 'photos/logs'});
            setTimeout(() => {
                if (!this.userScrolled)
                    this.scrollDown(smooth);
            }, 100);
        },
        stringToColor(str: string) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            let colour = '#';
            for (let i = 0; i < 3; i++) {
                const value = (hash >> (i * 8)) & 0xFF;
                colour += ('00' + value.toString(16)).substr(-2);
            }
            return colour;
        },
        logColor(type: string) {
            switch (type) {
                case 'log':
                    return '';
                case 'warn':
                    return 'warning';
                default:
                    return '';
            }
        },
        logIcon(type: string) {
            switch (type) {
                case 'log':
                    return '';
                case 'warn':
                    return 'mdi-alert';
                default:
                    return '';
            }
        },
    },
});
</script>

<style scoped>
.logs {
    overflow-y: auto;
    width: 100%;
}

.log-content {
    font-family: monospace;
    user-select: text;
    height: calc(100% - 100px);
    overflow-y: auto;
    padding: 15px;
}

.row {
    margin-bottom: -10px;
    padding: 2px;
    border-radius: 3px;
}

.row > * {
    margin-right: 10px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.icon {
    width: 30px;
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
}

.date {
    width: 110px;
}

.tag {
    width: 150px;
}

.message {
    max-width: calc(100% - 330px);
    overflow: visible;
    white-space: pre-wrap;
}

.scroll-button {
    position: absolute;
    z-index: 5;
    bottom: 50px;
    right: 60px;
}
</style>
