# Server

SoundCloud authentication doesn't supply a JWT. Therefore, when the user authenticates with SoundCloud, we need a simple server
to generate a JWT that can be used to sign in to Firebase on the client.

With proper SoundCloud OAuth, this server would also be the callback for SoundCloud, so that we know our users are properly authenticated.
