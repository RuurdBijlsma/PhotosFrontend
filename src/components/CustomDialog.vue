<template>
    <v-dialog v-model="prompt.show" max-width="500">
        <v-card>
            <v-card-title v-html="prompt.title"/>
            <v-card-text v-html="prompt.subtitle"/>
            <v-divider></v-divider>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn text @click="dialogCancel">
                    {{ prompt.cancelText }}
                </v-btn>
                <v-btn color="primary" text @click="dialogConfirm">
                    {{ prompt.confirmText }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script>

export default {
    name: "CustomDialog",
    methods: {
        dialogCancel() {
            this.$store.commit('hidePrompt');
        },
        dialogConfirm() {
            this.$store.commit('hidePrompt');
            this.prompt.onConfirm();
        },
    },
    watch: {
        'prompt.show'() {
            if (!this.prompt.show)
                this.prompt.onCancel();
        },
    },
    computed: {
        prompt(){
            return this.$store.state.prompt;
        },
    },
}
</script>

<style scoped>

</style>
