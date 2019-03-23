const Express = require("express");
const BodyParser = require("body-parser");
const MongoClient = require("mongodb").MongoClient;
const ObjectId = require("mongodb").ObjectID;
const imdb = require('./imdb.js');
const DENZEL_IMDB_ID = 'nm0000243';
const graphqlHTTP = require('express-graphql');
const {
    GraphQLObjectType,
    GraphQLID,
    GraphQLString,
    GraphQLInt,
    GraphQLSchema,
    GraphQLList
} = require('graphql');

movieType = new GraphQLObjectType({
    name: 'Movie',
    fields: {
        link: { type: GraphQLString },
        metascore: { type: GraphQLInt },
        year: { type: GraphQLInt },
        synopsis: { type: GraphQLString },
        title: {type: GraphQLString},
        review: {type: GraphQLString},
        date: {type: GraphQLString}
    }
});

const CONNECTION_URL = "mongodb+srv://user1:user1pwd@moviesdenzel-o3x42.mongodb.net/test?retryWrites=true";
const DATABASE_NAME = "MoviesDenzel";

var app = Express();
/*var router = Express.Router();
app.use('/movies/populate', router);
router.get('&metascore', function(request, response){
    response.send("router response");
})
*/
app.use(BodyParser.json());
app.use(BodyParser.urlencoded({ extended: true }));

var database, collection;


const queryType = new GraphQLObjectType({
    name: 'Query',
    fields: {
        hello: {
            type: GraphQLString,

            resolve: function () {
                return "Hello World";
            }
        },
        populateMovies: {
            type: GraphQLString,
            resolve: async function() {
                await sandbox(DENZEL_IMDB_ID);
                return "population insert";
            }            
        },        
        searchingMovieID: {
            type: movieType,
            args:{
                id:{type: GraphQLString}
            },
            resolve: function (source, args) {
                return collection.findOne({"id":args.id});
            }
        },
        searchingMovieName: {
            type: movieType,
            args:{
                id:{type: GraphQLString}
            },
            resolve: function(source, args){
                return collection.findOne({"title":args.id});
            }
        },        
        dateReviewQuery: {
            type: movieType,
            args: {
                id: {type: GraphQLString},
                date: {type:GraphQLString},
                review: {type: GraphQLString}
            },
            resolve: async function(source, args){
                await collection.updateOne({"id":args.id},{$set:{"date":args.date,"review":args.review}});
                return collection.findOne({"id":args.id});
            }
        },
        metascoreLimit: {
            type: new GraphQLList(movieType),
            args: {
                metascore: {type: GraphQLInt},
                limit: {type: GraphQLInt}
            },
            resolve: async function(source, args){
                const res = await collection.find({"metascore":{$gte:args.metascore}}).limit(args.limit).toArray();
                return res;
            }
        }
        
    }


});

const schema = new GraphQLSchema({ query: queryType });



app.listen(9292, () => {
        MongoClient.connect(CONNECTION_URL, { useNewUrlParser: true }, (error, client) => {
        if(error) {
            throw error;
        }
        database = client.db(DATABASE_NAME);
        collection = database.collection("movies");
        console.log("Connected to " + DATABASE_NAME + "!");
    });
});

app.use('/graphql', graphqlHTTP({
    schema: schema,
    graphiql: true,
}));

async function sandbox (actor) {
  try {
    console.log(`📽️  fetching filmography of ${actor}...`);
    const movies = await imdb(actor);
    console.log(`total : ${movies.length} movies `);
    for(var i =0; i < movies.length; i++)
    {
        collection.insertOne(movies[i]);
        console.log(`element ${i} inserted`);
    }
    return movies;
    process.exit(0);
    

  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

app.get("/movies/populate", (request, response) => {
     sandbox(DENZEL_IMDB_ID);
     //response = movies;
     response.send("population insert");
});

app.get("/movies", (request, response) =>{    
    collection.findOne({"metascore" : {$gte:70}}, (error, result) =>{
        if (error){
            return response.status(500).send(error);            
        }
        console.log("result : " + result);
        response.send(result);
    });
});
//Slightly modify the curl query to make it work using ?limit&metascore=77 ; otherwise the console will just split the command in two parts, after the "&" symbol
//Put the URL in quotes to make it work
app.get("/movies/search", (request, response) => {
    //console.log("1");
    var meta = parseInt(request.query.metascore);
    var limit = parseInt(request.query.limit);
    //console.log(meta);
    collection.find({"metascore" : {$gte:meta}}).limit(limit).toArray((error, result) => {
        if(error) {
            return response.status(500).send(error);
        }
        //console.log(result);
        response.send(result);
    });
});
app.get("/movies/:id", (request, response) => {
    //console.log("1");
    collection.findOne({ "id": request.params.id}, (error, result) => {
        if(error) {
            return response.status(500).send(error);
        }
        //console.log("2");
        response.send(result);
    });
});

//Use insomnia to post with windows OS
app.post("/movies/:id", (request, response) => {
    // req = request.body;
    console.log(request.body);
    collection.updateOne({ "id": request.params.id}, {$set:{"date":request.body.date, "review":request.body.review}}, (error, result) => {
        if(error) {
            return response.status(500).send(error);
        }
        response.send(request.params.id);
    });
 });


// app.post("/movie/:id", (request, response) => {
//     collection.insert(request.body, (error, result) => {
//         if(error) {
//             return response.status(500).send(error);
//         }
//         response.send(result.result);
//     });
// });
// app.get("/movies", (request, response) => {
//     collection.find({}).toArray((error, result) => {
//         if(error) {
//             return response.status(500).send(error);
//         }
//         response.send(result);
//     });
// });
// app.get("/person/:id", (request, response) => {
//     collection.findOne({ "_id": new ObjectId(request.params.id) }, (error, result) => {
//         if(error) {
//             return response.status(500).send(error);
//         }
//         response.send(result);
//     });
// });


