<template>
    <div class="login">
        <v-card class="login-card">
            <v-card-title>Login</v-card-title>
            <v-card-subtitle>
                <router-link to="/settings" class="no-style">{{ api }}</router-link>
            </v-card-subtitle>
            <v-card-text>
                <v-text-field label="Email" v-model="email"/>
                <v-text-field type="password" label="Password" v-model="password"
                              :type="showPass ? 'text' : 'password'"
                              :rules="[rules.required, rules.min]"
                              @click:append="showPass = !showPass"
                              :append-icon="showPass ? 'mdi-eye' : 'mdi-eye-off'"
                />
            </v-card-text>
            <v-card-actions>
                <v-spacer/>
                <v-btn :loading="loginLoading" primary text @click="login">Login</v-btn>
            </v-card-actions>
        </v-card>
    </div>
</template>

<script>
import {api} from "@/ts/constants";

export default {
    name: "Login",
    data: () => ({
        loginLoading: false,
        showPass: false,
        rules: {
            required: value => !!value || 'Required.',
            min: v => v.length >= 3 || 'Min 3 characters',
        },
        email: '',
        password: '',
        api,
    }),
    methods: {
        async login() {
            this.loginLoading = true;
            let success = await this.$store.dispatch('checkLogin', {email: this.email, password: this.password});
            if (success) {
                this.$store.commit('mapboxKey', success.mapboxToken);
                await this.$router.push("/");
            }
            this.loginLoading = false;
        },
    },
}
</script>

<style scoped>
.login-card {
    margin: 10px auto;
    max-width: 600px;
    width: 100%;
}
</style>
