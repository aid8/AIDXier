const config = {
  apiKey: 'AIzaSyDbE43EtFgQ8K8H42uFBQLdG6903_d4hhw',
  authDomain: 'aidxier-19a98.firebaseapp.com',
  projectId: 'aidxier-19a98',
  storageBucket: 'aidxier-19a98.appspot.com',
  messagingSenderId: '385746246531',
  appId: '1:385746246531:web:dcfb7e8d9ea77d056634b6',
};

//Initialize firebase
firebase.initializeApp(config);
const firestore = firebase.firestore();

const signUpForm = document.querySelector('#signUpForm');
const loginForm = document.querySelector('#loginForm')
const logoutBtn = document.querySelector('#logoutBtn');
const postSubmit = document.querySelector('#postSubmit');
const progressBarForm = document.querySelector('#progressBarForm');
const progressHandlerForm = document.querySelector('#progressHandlerForm');

//Change Title and Keywords
if (document.querySelector('#signUpTitle') != null) {
  let id = window.location.href.split('?').pop();
  let signUpTitle = document.querySelector('#signUpTitle');
  let title = 'SIGN UP AS ';
  title += id == 'Patient' ? 'PATIENT' : 'MEDICAL PRACTICIONER';
  signUpTitle.textContent = title;
  if (id != 'Patient') {
    document.querySelector('#recordInputText').textContent = 'Medical Practitioner Certificate';
  }
}

//USERS SIGN UP 
if (signUpForm != null) {
  let d, uid;
  const accountType = window.location.href.split('?').pop();
  signUpForm.addEventListener('submit', async (e) => {
    e.preventDefault(); //Prevent refresh
    let name = document.getElementById('nameInput').value;
    let email = document.getElementById('emailInput').value;
    let pass = document.getElementById('passwordInput').value;
    let contact = document.getElementById('contactInput').value;
    let record = document.getElementById('recordInput').files[0];
    let auth = firebase.auth();
    let fieldsOk = true;
    
    //TODO : CHECK IF IT IS REAL EMAIL AND ALL FIELDS ARE OK
    if(fieldsOk){
      //Show Progess Bar
      progressHandlerForm.style.display = 'block';

      const storageRef = firebase.storage().ref();
      const storageChild = storageRef.child(record.name);

      //Upload the file(record)
      const postCover = storageChild.put(record);

      //Wait for the file(record) to be Uploaded
      await new Promise((resolve) => {
        postCover.on('stage_changed',(snapshot) => {
          let progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(Math.trunc(progress));
          
          progressHandlerForm.style.display = true;
          progressBarForm.value = progress;
          postSubmit.disabled = true;
        },
        (error) => {
          //Add element to show error upon uploading
          console.log(error);
        },
        async () => {
          const downloadURL = await storageChild.getDownloadURL();
          d = downloadURL;
          console.log(d);
          //tell everything is done (exit await)
          resolve();
        });
      });
        
      const fileRef = await firebase.storage().refFromURL(d);

      //After uploading file (record), Create account in firebase auth and upload other info in storage
      auth.createUserWithEmailAndPassword(email, pass)
      .then(async(user) => {
        uid = auth.currentUser.uid;
        let accountInfo = {
          uid,
          name,
          contact,
          accountType,
          record: d,
          fileref: fileRef.toString(),
        };

        if(accountType == 'Patient') {
          await firebase.firestore().collection('patient-accounts-info').doc(uid).set(accountInfo);
        } 
        else{
          await firebase.firestore().collection('doc-accounts-info').doc(uid).set(accountInfo);
        }

        //After a success sign up, go to homepage
        if (postSubmit != null) {
          gotoPage(accountType, "homepage");
          postSubmit.disabled = false;
        }
      })
      //if there are any errors in adding account (e.g. invalid email format)
      .catch(function(ce){
        console.log(ce.message);
        postSubmit.disabled = false;
      });
    }
    else{
      //If there is a missing field or data
      //ADD a warning
      console.log('Please Input all fields!');
    }
  });
}

//USERS LOG IN
if(loginForm != null){
  loginForm.addEventListener('submit', async(e) =>{
    e.preventDefault(); //Prevent refresh
    let email = document.getElementById('emailInput').value;
    let pass = document.getElementById('passwordInput').value;
    let auth = firebase.auth();
    
    //Sign in
    auth.signInWithEmailAndPassword(email, pass)
    //if account not found
    .catch(function(ce){
      console.log(ce.message);
    });

    //get accounttype in firestore (change below)
    const accountType = window.location.href.split('?').pop();
    gotoPage(accountType, "homepage");
  });
}

function gotoPage(accountType, page){
  let homepageURL = (accountType == 'Patient') ? "patient/" : "medical-practitioner/";
  switch(page){
    case "homepage":
      window.location.replace(homepageURL+page+".html");
    break;

    case "test":

    break;

    default:
  }
}

if(logoutBtn != null){
  //firebase.auth().signOut();
}

//A realtime listener firebase
firebase.auth().onAuthStateChanged(firebaseUser =>{
  if(firebaseUser){
    console.log("logged in" + firebaseUser);
    //logoutBtn.classList.remove('hide');
  }
  else{
    console.log("not logged in");
    //logoutBtn.classList.add('hide');
  }
});