function say(name){
    if (typeof name !== 'string') {
        console.error("Invalid name argument; expected a string, received:", name);
        return;
    }
    console.log("Hello, " + name + "!");
}

say("World");
say("Alice");
say("Bob");