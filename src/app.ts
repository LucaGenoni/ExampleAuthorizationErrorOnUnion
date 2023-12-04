import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { Neo4jGraphQL } from "@neo4j/graphql";
import neo4j from "neo4j-driver";

const typeDefs = `#graphql
    type JWT @jwt {
      username: String 
    }

    type Author {
        username: String!
    }
    type Author2 {
        others: String!
    }
    union AuthorUnion = Author | Author2

    type PostNoUnion @authorization(validate: [
      { operations: [CREATE, UPDATE, DELETE], requireAuthentication:true, where: { node: { first: { username: "$jwt.username" }}  }, when: "BEFORE" }
    ]) {
        title: String!
        first: Author! @relationship(type: "HAS_UNION", direction: OUT)
    }
    # type PostWithUnionError @authorization(validate: [
    #   { operations: [CREATE, UPDATE, DELETE], requireAuthentication:true, where: { node: { myUnion: { Author: { username: "$jwt.username" }}} }, when: "BEFORE" }
    # ]) {
    #     title: String!
    #     myUnion: AuthorUnion! @relationship(type: "HAS_UNION", direction: OUT)
    # }

    type PostWithUnion @authorization(validate: [
      { operations: [CREATE, UPDATE, DELETE], requireAuthentication:true, where: { node: { myUnionConnection: { Author: { node: {username: "$jwt.username" }}}} }, when: "BEFORE" }
    ]) {
        title: String!
        myUnion: AuthorUnion! @relationship(type: "HAS_UNION", direction: OUT)
    }
`;

const driver = neo4j.driver(
  "neo4j://localhost:7687",
  neo4j.auth.basic("neo4j", "password")
);

const neo4jgraphql = new Neo4jGraphQL({
  typeDefs,
  driver,
});

const schema = await neo4jgraphql.getSchema();

const server = new ApolloServer({
  schema,
});

const { url } = await startStandaloneServer(server, {
  // Your async context function should async and return an object
  context: async ({ req }) => {
    if (Array.isArray(req.headers.user) || Array.isArray(req.headers.password))
      return {
        sessionConfig: {
          auth: neo4j.auth.basic(req.headers.user[0], req.headers.password[0]),
        }
      }
    return {
      sessionConfig: {
        auth: neo4j.auth.basic(req.headers.user, req.headers.password),
      }
    }
  },
});

console.log(`🚀  Server ready at: ${url}`);
