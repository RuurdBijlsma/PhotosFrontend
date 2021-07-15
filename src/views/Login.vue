<template>
    <v-form class="login" @submit.prevent="login">
        <v-card class="login-card">
            <v-card-title>Login</v-card-title>
            <v-card-text>
                <v-text-field name="apiUrl" class="mt-4"
                              label="API endpoint"
                              v-model="apiUrl"/>
                <v-text-field label="Email" v-model="email"/>
                <v-text-field type="password" label="Password" v-model="password"
                              :type="showPass ? 'text' : 'password'"
                              :rules="[rules.required, rules.min]"
                              @click:append="showPass = !showPass"
                              :append-icon="showPass ? 'mdi-eye' : 'mdi-eye-off'"/>
            </v-card-text>
            <v-card-actions>
                <v-spacer/>
                <v-btn :loading="loginLoading" primary text type="submit">Login</v-btn>
            </v-card-actions>
        </v-card>
    </v-form>
</template>

<script lang="ts">
import {api} from "@/ts/constants";
import Vue from "vue";

export default Vue.extend({
    name: "Login",
    data: () => ({
        apiUrlChanged: false,
        loginLoading: false,
        showPass: false,
        serverResponding: true,
        rules: {
            required: (v: string) => !!v || 'Required.',
            min: (v: string) => v.length >= 3 || 'Min 3 characters',
        },
        email: '',
        password: '',
        api,
    }),
    methods: {
        async login() {
            this.loginLoading = true;
            let success, error;
            try {
                console.log("Check login with api", this.apiUrl);
                success = await this.$store.dispatch('checkLogin', {
                    email: this.email,
                    password: this.password,
                    api: this.apiUrl,
                });
                error = '';
            } catch (e) {
                success = false;
                error = '. Server is not responding';
            }
            if (success) {
                this.$store.commit('mapboxKey', success.mapboxToken);
                if (this.apiUrlChanged) {
                    location.pathname = __webpack_public_path__;
                } else {
                    await this.$router.push("/");
                }
            } else {
                console.log("failed to login", success);
                await this.$store.dispatch('addSnack', {text: `Failed to login${error}`});
            }
            this.loginLoading = false;
        },
    },
    computed: {
        apiUrl: {
            get(): string {
                return this.api;
            },
            set(v: string) {
                this.api = v;
                localStorage.api = v;
                this.apiUrlChanged = v !== api;
            },
        },
    }
});
</script>

<style scoped>
.login-card {
    margin: 10px auto;
    max-width: 600px;
    width: 100%;
}
</style>
