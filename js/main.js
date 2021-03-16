const config = {
    apiKey: "AIzaSyDbE43EtFgQ8K8H42uFBQLdG6903_d4hhw",
    authDomain: "aidxier-19a98.firebaseapp.com",
    projectId: "aidxier-19a98",
    storageBucket: "aidxier-19a98.appspot.com",
    messagingSenderId: "385746246531",
    appId: "1:385746246531:web:dcfb7e8d9ea77d056634b6"
}

firebase.initializeApp(config);

const firestore = firebase.firestore();

//Create Account Form for Patients
const signUpFormPatient = document.querySelector("#signUpFormPatient");
const progressBar = document.querySelector("#progressBar");
const progressHandler = document.querySelector("#progressHandler");
const postSubmit = document.querySelector("#postSubmit");

if(signUpFormPatient != null){
    let d;
    signUpFormPatient.addEventListener("submit", async(e)=>{
        e.preventDefault(); //Prevent refresh

        //Validation
        if(document.getElementById("nameInput").value != "" && document.getElementById("emailInput").value != "" && document.getElementById("recordInput").files[0] != ""){
            let name = document.getElementById("nameInput").value;
            let email = document.getElementById("emailInput").value;
            let contact = document.getElementById("contactInput").value;
            let record = document.getElementById("recordInput").files[0];
            console.log(record);

            const storageRef = firebase.storage().ref();
            const storageChild = storageRef.child(record.name);

            console.log("Uploading file");
            const postCover = storageChild.put(record);

            //Wait for the file to be Uploaded
            await new Promise((resolve)=> {
                postCover.on("stage_changed", (snapshot)=> {
                    let progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log(Math.trunc(progress));

                    if(progressHandler != null){
                        progressHandler.style.display = true;
                    }

                    if(postSubmit != null){
                        postSubmit.disabled = true;
                    }

                    if(progressBar != null){
                        progressBar.value = progress;
                    }

                }, (error) => {
                    //error log
                    //Add element to show error
                    console.log(error)
                
                }, async() =>{
                    const downloadURL = await storageChild.getDownloadURL();
                    d = downloadURL;
                    console.log(d);
                    //tell everything is done (exit await)
                    resolve(); 
                });
            });

            const fileRef = await firebase.storage().refFromURL(d);

            let post = {
                name,
                email,
                contact,
                record: d,
                fileref: fileRef.toString()
            }

            await firebase.firestore().collection("patient-accounts").add(post);
            console.log("PATIENT ACCOUNT CREATED");

            if(postSubmit != null){
                location.reload();
                postSubmit.disabled = false;
            }
        }
        else{
            //If there is a missing field or data
            //ADD a warning
            console.log("Please Input all fields!")
        }
    })
}

//Create Account form for Medical Practitioner