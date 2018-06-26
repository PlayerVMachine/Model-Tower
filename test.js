let test = {
    thing1 : {
        value: 4,
        also: 1
    },
    thing2 : {
        value: 8,
        also: -1
    },
    thing3 : {
        value: 6,
        also: 5
    }
}

let final = Object.entries(test).sort((a,b) => {
    console.log((b[1].value - a[1].value))
    return b[1].value - a[1].value
})

console.dir(test, {depth:2})
console.log('-----------------------------------------')
console.dir(final, {depth:2})