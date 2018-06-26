let test = {
    thing1 : {
        value: 4,
        also: 0
    },
    thing2 : {
        value: 8,
        also: 0
    },
    thing3 : {
        value: 6,
        also: 0
    }
}

let final = Object.entries(test).sort((a,b) => {
    console.log(b.value + ' - ' + a.value " = " + (b.value - a.value))
    return b.value - a.value
})

console.dir(test, {depth:2})
console.log('-----------------------------------------')
console.dir(final, {depth:2})