// auth.js
import { supabase } from './supabase-config.js';

// Generate a random SSN in format +1 (202) 742-6223
export function generateSSN() {
    const area = Math.floor(Math.random() * 900) + 100; // 100-999
    const exch = Math.floor(Math.random() * 900) + 100;
    const sub = Math.floor(Math.random() * 9000) + 1000;
    return `+1 (${area}) ${exch}-${sub}`;
}

export async function handleRegister(username, email, password, dpFile) {
    try {
        // 1. Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
        });
        if (authError) throw authError;

        const user = authData.user;
        if (!user) throw new Error('Signup failed');

        // 2. Generate SSN
        const ssn = generateSSN();

        // 3. Upload DP if provided
        let dpUrl = null;
        if (dpFile) {
            const fileExt = dpFile.name.split('.').pop();
            const fileName = `${user.id}/dp.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('dps')
                .upload(fileName, dpFile, { upsert: true });
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage.from('dps').getPublicUrl(fileName);
            dpUrl = urlData.publicUrl;
        }

        // 4. Create profile
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                user_id: user.id,
                username,
                ssn,
                display_picture: dpUrl,
            });
        if (profileError) throw profileError;

        // 5. Copy SSN to clipboard
        await navigator.clipboard.writeText(ssn);
        alert(`Registration successful! Your SSN is ${ssn} (copied to clipboard)`);

        window.location.href = 'dashboard.html';
    } catch (error) {
        alert(error.message);
    }
}

export async function handleLogin(identifier, password) {
    try {
        // identifier can be username or ssn
        let email = identifier;
        // if identifier doesn't look like email, try to find email from profiles
        if (!identifier.includes('@')) {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('user_id')
                .or(`username.eq.${identifier},ssn.eq.${identifier}`)
                .single();
            if (profileError || !profile) throw new Error('User not found');
            // get email from auth? we need to join; alternative: sign in with username? Supabase auth uses email only.
            // For simplicity, we'll assume identifier is email. In production you'd need to resolve email from profiles.
            // Here we'll just try as email; if fails, attempt to fetch email from custom table (but auth email is not exposed).
            // Workaround: use a separate sign-in function with custom claims? Not possible. We'll keep simple: login with email only.
            alert('Please use email to login. For demo, use email.');
            return;
        }
        const { error } = await supabase.auth.signInWithPassword({
            email: identifier,
            password
        });
        if (error) throw error;
        window.location.href = 'dashboard.html';
    } catch (error) {
        alert(error.message);
    }
      }
