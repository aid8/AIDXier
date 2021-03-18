/*TODO:
  = CHECK ALL FIELDS IN SIGN UP IS FILLED UP AND ADD NOTIFICATION TO USER
  = ADD NOTIFICATION IN LOGIN
*/

const config = {
  apiKey: 'AIzaSyDbE43EtFgQ8K8H42uFBQLdG6903_d4hhw',
  authDomain: 'aidxier-19a98.firebaseapp.com',
  projectId: 'aidxier-19a98',
  storageBucket: 'aidxier-19a98.appspot.com',
  messagingSenderId: '385746246531',
  appId: '1:385746246531:web:dcfb7e8d9ea77d056634b6',
};

firebase.initializeApp(config);
const firestore = firebase.firestore();

//----------GLOBAL VARIABLES----------//
const signUpForm = document.querySelector('#signUpForm');
const loginForm = document.querySelector('#loginForm')
const logoutBtn = document.querySelector('#logoutBtn');
const postSubmit = document.querySelector('#postSubmit');
const progressBarForm = document.querySelector('#progressBarForm');
const progressHandlerForm = document.querySelector('#progressHandlerForm');

const titleSignUp = document.querySelector('#titleSignUp');
const userNameHomepage = document.querySelector('#userNameHomepage');

//----------USERS SIGN UP----------//
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
    
    //TODO : CHECK IF ALL FIELDS ARE OK
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
          gotoPage("homepage", accountType);
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

//----------USERS LOG IN----------//
if(loginForm != null){
  loginForm.addEventListener('submit', async(e) =>{
    e.preventDefault(); //Prevent refresh
    let email = document.getElementById('emailInput').value;
    let pass = document.getElementById('passwordInput').value;
    let auth = firebase.auth();

    //Sign in
    auth.signInWithEmailAndPassword(email, pass)
    .then(async(user) => {
      gotoPage("homepage", getUserType());
    })
    //if account not found
    .catch(function(ce){
      console.log(ce.message);
    });
  });
}

//----------CHANGE DATA ACC TO USER OR ACC----------//
//=====SIGNUP FORMS====//
if (titleSignUp != null) {
  let id = window.location.href.split('?').pop();
  let title = 'SIGN UP AS ';
  title += id == 'Patient' ? 'PATIENT' : 'MEDICAL PRACTICIONER';
  titleSignUp.textContent = title;
  if (id != 'Patient') {
    document.querySelector('#recordInputText').textContent = 'Medical Practitioner Certificate';
  }
}

//=====HOMEPAGE FORMS====//
if(logoutBtn != null){
  logoutBtn.addEventListener('click', e=>{
    firebase.auth().signOut();
    gotoPage("index");
  });
}

//Add here codes that needs await
async function changePageDetails(){
  if (userNameHomepage != null){
    let userData = await getUserData();
    userNameHomepage.textContent = "Welcome " + userData.name;
  }
}
changePageDetails();


//----------FUNCTIONS----------//
function gotoPage(page, accountType){
  let homepageURL = (accountType == 'Patient') ? "patient/" : "medical-practitioner/";
  switch(page){
    case "homepage":
      window.location.replace("/pages/"+homepageURL+page+".html");
    break;

    case "index":
      window.location.replace("/index.html");
    break;

    default:
  }
}

function getUserType(){
  let accountType = window.location.href.split('?').pop();
  //Just Incase if accountType is not present find the account manually
  if(accountType == "Patient" || accountType == "Doc"){
    return accountType;
  }
  return new Promise(resolve =>{
    firebase.auth().onAuthStateChanged(async (user) =>{
      firestore.collection("doc-accounts-info").doc(user.uid).get().then((doc)=>{
        if(doc.exists){
          resolve(doc.data().accountType);
        }
      });
      firestore.collection("patient-accounts-info").doc(user.uid).get().then((doc)=>{
        if(doc.exists){
          resolve(doc.data().accountType);
        }
      });
    });
  });
}

function getUserData(){
  let collection;
  return new Promise(resolve =>{
    firebase.auth().onAuthStateChanged(async(user) =>{
      if(user){
        collection = (await getUserType() == "Patient") ? "patient" : "doc";
        console.log(collection);
        firestore.collection(collection+"-accounts-info").doc(user.uid).get().then((doc)=>{
          if(doc.exists){
            resolve(doc.data());
          }
        });
      }
    });
  });
}

//----------FIREBASE REALTIME LISTENER----------//
firebase.auth().onAuthStateChanged(user =>{
  if(user){
    console.log("logged in" + user.uid);
  }
  else{
    console.log("not logged in");
    //logoutBtn.classList.add('hide');
  }
});