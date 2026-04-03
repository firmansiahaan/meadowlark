/* eslint-disable no-undef */
const express = require('express')
const expressHandlebars = require('express-handlebars')
const fortune = require('./lib/fortune.js')

const app = express()
const port = process.env.PORT || 3000
const bodyParser = require('body-parser')
const multiparty = require('multiparty')
const weatherMiddlware = require('./lib/middleware/weather')

// typically at the top of the file
const handlers = require('./lib/handlers')

const tours = [
    { id: 0, name: 'Hood River', price: 99.99 },
    { id: 1, name: 'Oregon Coast', price: 149.95 },
]

// configure Handlebars view engine
const expressHandlebars = require('express-handlebars')
var handlebars = expressHandlebars.create({
    defaultLayout: 'main',
    helpers: {
        section: function (name, options) {
            if (!this._sections) this._sections = {}
            this._sections[name] = options.fn(this)
            return null
        },
    },
});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.use(express.static(__dirname + '/public'))
app.use(weatherMiddlware)

app.get('/', handlers.home)
// app.get('/section-test', handlers.sectionTest)

app.get('/about', handlers.about)

app.get('/about', (req, res) => {
    const randomFortune = fortunes[Math.floor(Math.random() * fortunes.length)]
    res.render('about', { fortune = fortune.getFortune() })
})

app.get('/headers', (req, res) => {
    res.type('text/plain')
    const headers = Object.entries(req.headers)
        .map(([key, value]) => `${key}: ${value}`)
    res.send(headers.join('\n'))
})

app.get('/greeting', (req, res) => {
    res.render('greeting', {
        message: 'Hello esteemed programmer!',
        style: req.query.style,
        userid: req.cookies.userid,
        username: req.session.username
    })
})

// the following layout doesn't have a layout file, so
// views/no-layout.handlebars must include all necessary HTML
app.get('/no-layout', (req, res) => res.render('no-layout', { layout: null }))

// the layout file views/layouts/custom.handlebars will be used
app.get('/custom-layout', (req, res) =>
    res.render('custom-layout', { layout: 'custom' })
)

app.get('/text', (req, res) => {
    res.type('text/plain')
    res.send('this is a test')
})

app.post('/process-contact', (req, res) => {
    try {
        // here's where we would try to save contact to database or other
        // persistence mechanism...for now, we'll just simulate an error
        if (req.body.simulateError) throw new Error("error saving contact!")
        console.log(`received contact from ${req.body.name} <${req.body.email}>`)
        res.format({
            'text/html': () => res.redirect(303, '/thank-you'),
            'application/json': () => res.json({ success: true }),
        })
    } catch (err) {
        // here's where we would handle any persistence failures
        console.error(`error processing contact from ${req.body.name} ` + ` <${req.body.email}>`)
        res.format({
            'text/html': () => res.redirect(303, '/error'),
                'application/json': () => res.json({success: false, error: err.message }),
        })
    }
})

app.get('/api/tours', (req, res) => {
    const toursXml = '<?xml version="1.0"?><tours>' +
        tours.map(p =>
            `<tour price="${p.price}" id="${p.id}">${p.name}</tour>`
        ).join('') + '</tours>'
    const toursText = tours.map(p =>
        `${p.id}: ${p.name} (${p.price})`
    ).join('\n')
    res.format({
        'application/json': () => res.json(tours),
        'application/xml': () => res.type('application/xml').send(toursXml),
        'text/xml': () => res.type('text/xml').send(toursXml),
        'text/plain': () => res.type('text/plain').send(toursText),
    })
})

app.put('/api/tour/:id', (req, res) => {
    const p = tours.find(p => p.id === parseInt(req.params.id))
    if (!p) return res.status(404).json({
        error: 'No such tour exists'
    })
    if (req.body.name) p.name = req.body.name
    if (req.body.price) p.price = req.body.price
    res.json({ success: true })
})

app.delete('/api/tour/:id', (req, res) => {
    const idx = tours.findIndex(tour => tour.id === parseInt(req.params.id))
    if (idx < 0) return res.json({
        error: 'No such tour exists.'
    })
    tours.splice(idx, 1)
    res.json({ success: true })
})

// handlers for browser-based form submission
app.get('/newsletter-signup', handlers.newsletterSignup)
app.post('/newsletter-signup/process', handlers.newsletterSignupProcess)
app.get('/newsletter-signup/thank-you', handlers.newsletterSignupThankYou)

// handlers for fetch/JSON form submission
app.get('/newsletter', handlers.newsletter)
app.post('/api/newsletter-signup', handlers.api.newsletterSignup)

// vacation photo contest
app.get('/contest/vacation-photo', handlers.vacationPhotoContest)
app.get('/contest/vacation-photo-ajax', handlers.vacationPhotoContestAjax)
app.post('/contest/vacation-photo/:year/:month', (req, res) => {
    const form = new multiparty.Form()
    form.parse(req, (err, fields, files) => {
        if (err) return handlers.vacationPhotoContestProcessError(req, res, err.message)
        console.log('got fields: ', fields)
        console.log('and files: ', files)
        handlers.vacationPhotoContestProcess(req, res, fields, files)
    })
})
app.get('/contest/vacation-photo-thank-you', handlers.vacationPhotoContestProcessThankYou)
app.post('/api/vacation-photo-contest/:year/:month', (req, res) => {
    const form = new multiparty.Form()
    form.parse(req, (err, fields, files) => {
        if (err) return handlers.api.vacationPhotoContestError(req, res, err.message)
        handlers.api.vacationPhotoContest(req, res, fields, files)
    })
})


// this should appear AFTER all of your routes
app.use((req, res) =>
    res.status(404).render('404')
)

// custom 404 page
app.use(handlers.notFound)

// custom 500 page
app.use(handlers.serverError)

// this should appear AFTER all of your routes
// note that even if you don't need the "next" function, it must be
// included for Express to recognize this as an error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error('** SERVER ERROR: ' + err.message)
    res.status(500).render('08-error',
        { message: "you shouldn't have clicked that!" })
})

if (require.main === module) {
    app.listen(port, () => console.log(
        `Express started on http://localhost:${port} press Ctrl-C to terminate.`
    ))
} else {
    module.exports = app
}