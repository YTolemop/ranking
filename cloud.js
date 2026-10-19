'use strict';
window.Cloud = (() => {
  let client;
  const config=window.BRACKET_CONFIG||{};
  const configured=Boolean(config.supabaseUrl&&config.supabaseKey);
  async function initialize(onAuth){
    if(!configured)return;
    const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.57.4?bundle');
    client=createClient(config.supabaseUrl,config.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    client.auth.onAuthStateChange(()=>setTimeout(onAuth,0));
    const {error}=await client.auth.getSession();if(error)throw error;
  }
  async function isAdmin(){const {data,error}=await client.rpc('bracket_is_admin');if(error)throw error;return data===true}
  async function load(){const {data,error}=await client.from('bracket_tournament').select('payload,revision').eq('id',1).maybeSingle();if(error)throw error;return data}
  async function save(payload,revision){const {data,error}=await client.rpc('bracket_save',{new_payload:payload,expected_revision:revision});if(error)throw error;return data}
  async function login(email){const {error}=await client.auth.signInWithOtp({email,options:{shouldCreateUser:false,emailRedirectTo:new URL('./',location.href).href}});if(error)throw error}
  async function logout(){const {error}=await client.auth.signOut();if(error)throw error}
  return {configured,initialize,isAdmin,load,save,login,logout};
})();
