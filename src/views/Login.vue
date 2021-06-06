<template>
    <div class="login">
        <v-card class="login-card">
            <v-card-title>Login</v-card-title>
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
                <v-btn primary text @click="login">Login</v-btn>
            </v-card-actions>
        </v-card>
    </div>
</template>

<script>
export default {
    name: "Login",
    data: () => ({
        showPass: false,
        rules: {
            required: value => !!value || 'Required.',
            min: v => v.length >= 3 || 'Min 3 characters',
        },
        email: '',
        password: '',
    }),
    methods: {
        async login() {
            let success = await this.$store.dispatch('checkLogin', {email: this.email, password: this.password});
            if (success) {
                await this.$router.push("/");
            }
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
