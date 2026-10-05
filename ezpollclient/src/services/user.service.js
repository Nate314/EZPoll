import * as ezpollapi from './ezpoll.service';

let ready;

// Resolves once sessionStorage holds a user_guid the server knows: the stored
// one when it is still valid, otherwise a newly created one. The work is
// started on the first call and shared by every caller.
export function userReady() {
    if (!ready) {
        ready = new Promise(resolve => {
            const createUser = () => ezpollapi.getUser('new', response => {
                if (response && response.UserGUID) {
                    sessionStorage.setItem('user_guid', response.UserGUID);
                    resolve();
                }
            });
            const user_guid = sessionStorage.getItem('user_guid');
            if (user_guid) {
                // A stored user that no longer exists server-side gets replaced.
                ezpollapi.getUser(user_guid, response => {
                    if (response && response.UserGUID) {
                        resolve();
                    } else {
                        sessionStorage.removeItem('user_guid');
                        createUser();
                    }
                });
            } else {
                createUser();
            }
        });
    }
    return ready;
}
